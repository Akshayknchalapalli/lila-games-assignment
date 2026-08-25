# Research: Player Journey Visualization

**Feature**: `001-player-journey-viz`  
**Date**: 2026-08-25  
**Constitution**: v1.1.0

All Technical Context items that could have been `NEEDS CLARIFICATION` are resolved here. The UI MUST consume the canonical model only (`Parquet → Normalize → Index/Reconstruct → Project → Filter → Visualize`).

---

## 1. Runtime shape: build-time canonical artifacts + static web app

**Decision**: A Python pipeline reads `player_data/` Parquet once and writes a canonical JSON index plus per-match event files and heatmap bins. A TypeScript web app loads those artifacts in the browser. The web app MUST NOT read Parquet.

**Rationale**: ~1,243 small Parquet files and 9–12 MB minimaps are hostile on the critical path (Principle V, Quality Gate 7). Precomputing an index lets the first map view load metadata only; match detail loads on selection (FR-015, SC-007). Static hosting satisfies Quality Gate 9 without a server.

**Alternatives considered**:

- **DuckDB-WASM / Parquet in the browser**: Puts raw Parquet in the UI layer, violating Principle I/II pipeline and the first-view budget.
- **Always-on API + database**: Unnecessary at ~89k rows; adds hosting cost and failure modes for a 5-day frozen export.
- **Streamlit / Dash**: Faster to a demo, weaker playback/canvas control, harder to hit 30 FPS and Level-Designer chrome (Principle IV).

---

## 2. Languages and libraries

**Decision**:

| Layer | Choice |
|-------|--------|
| Pipeline | Python 3.11+, `pyarrow` for Parquet, `Pillow` for minimap compression |
| Tests (pipeline) | `pytest` |
| Web | TypeScript, Vite, React |
| Draw | Canvas 2D (`requestAnimationFrame` for playback) |
| Tests (domain) | Vitest — `worldToPixel` against generated MapConfig, playhead, filters |
| Host | Static site (Vercel or Netlify) |

**Rationale**: `pyarrow` was validated against representative extensionless source files during repository inspection (see §11). TypeScript gives a typed canonical model in the UI. Canvas 2D can draw a match's paths and markers at ≥30 FPS without a WebGL stack. React is only for chrome (filters, legend, play/pause), not for one DOM node per sample (Story 5 / Principle V).

**Alternatives considered**:

- **All-TypeScript ingest** (`hyparquet` / parquet-wasm): Feasible, but Python + pyarrow is the documented data path and easier to skip corrupt files with a counted error list.
- **WebGL / deck.gl / Mapbox**: Overkill at this scale; extra complexity vs Principle I.
- **SVG paths**: Fine for a few journeys; playback of a full match with bots is likelier to jank than Canvas.

---

## 3. Projection ownership

**Authoritative artifact**: `contracts/map-config.json` (schema: `contracts/map-config.schema.json`) is the single source of truth for **projection parameters** (`mapId`, `scale`, `originX`, `originZ`, `imageWidth`, `imageHeight`) and the shared **test vectors**. It is not an executable projection function. The pipeline copies those parameters into `index.json` `maps`. Python and TypeScript MUST load that config. They MUST NOT hardcode scale/origin in source.

**Decision**: Python and TypeScript each implement the same documented projection formula (`contracts/projection.md`) and MUST pass the shared `testVectors`. Two implementations are expected (two runtimes); duplicated map constants are not.

- Canonical match events keep world `(x, z)` (and elevation `y` unused for 2D).
- **Python** loads MapConfig at build time and applies the documented formula to project world → pixel → 64×64 bin when emitting heatmap grids. Bins are already in pixel/bin space; the browser does not re-project samples to build heatmaps.
- **TypeScript** `worldToPixel(mapConfig, x, z)` is the UI/domain implementation of that same formula, used to draw raw match coordinates. It reads MapConfig from the loaded index — the same parameters Python used — not a second table.
- Quality Gate 2 tests (including Ambrose Valley `(-301.45, -355.55) → (~78, ~890)`) run against `testVectors` in both pytest and Vitest.

**Rationale**: Constitution Principle I/II require one source of truth for per-map scale and origin, not a single shared binary across languages. Two copies of the formula with duplicated literals would drift. One MapConfig → two implementations → same test vectors.

**Alternatives considered**:

- Dual hardcoded formulas in Python and TypeScript with “identical” comments — rejected; that is two sources of truth for parameters.
- Pre-project all event pixels in Python and delete TS `worldToPixel` — faster draw, but then the UI cannot independently prove Gate 2 on world coordinates.
- TS-only projection, Python heatmaps in world space — bins would not share pixel space with the canvas.

---

## 4. Index grain and heatmap bins

**Decision**:

- **Index**: `collectionDay → mapId → matchId` with human/bot counts, discrete-event counts, `ts` min/max, `partialDay` flag.
- **Match payload**: loaded only when a match is selected.
- **Heatmap bins**: 64×64 grids per overlay (`traffic`, `kill`, `death`), produced at **map+day** grain and **per-match** grain. Render as a Canvas `ImageData` (or a single bitmap), never as a DOM node per `Position`/`BotPosition`.

**Rationale**: 64×64 is enough for a 1024×1024 map to show hot spots without painting ~85% movement samples as objects. Filter changes swap the bin grid (Story 5 failure: no leftover overlay).

**Alternatives considered**: 128×128 (heavier, little extra for designers); clustering libraries (unneeded).

---

## 5. Actor and event classification

**Decision**:

- Human: `user_id` matches UUID shape (`8-4-4-4-12` hex).
- Bot: `user_id` is entirely digits.
- Otherwise: `actorKind = unknown` → do not coerce to human or bot. Write the record to the diagnostics quarantine artifact, increment `unknownActors`, continue.
- Event bytes decoded UTF-8; names must be one of the eight. Unknown name → `eventKind = unknown`: quarantine + `unknownEvents` count, never another marker.
- Unknown `mapId` → quarantine the affected records + increment `unknownMaps`; the affected match/view MUST NOT be rendered using a stand-in map. Isolation is record-level unless the match cannot be safely reconstructed.
- Quarantined rows MUST NOT appear as normal paths/markers/heatmap bins. They MUST NOT be dropped without a count and a stored diagnostic row.
- Kill overlay bins: `Kill`, `BotKill`.
- Death overlay bins: `Killed`, `BotKilled`, `KilledByStorm`.
- Traffic bins: `Position`, `BotPosition`.

**Rationale**: Matches Principle II and Story 2. Kill vs death overlays answer different Level-Designer questions (where fights are dealt vs where people go down).

**Alternatives considered**: Filename-only classification (fragile if a file is renamed); treating `BotKill` as death (wrong actor).

---

## 6. Time and date

**Decision (semantic contract)**: `collectionDay` is the folder name (`February_10` … `February_14`) and is the only date used for filters. `ts` is preserved in its source numeric representation and is used only for ordering and playback within a reconstructed match. It MUST NOT be interpreted as wall-clock calendar time. February 14 sets `partialDay: true`. Playback labels show elapsed time from the match's minimum `ts`.

**Physical type (inspection)**: Repository inspection of representative extensionless files showed Parquet field `ts` as `timestamp[ms]`. The pipeline MUST record that unit on the canonical payload (e.g. `tsUnit: "ms"` on the index or match detail) so the model does not silently assume a unit later. If a later file disagrees, that is an error/empty contribution — not a coerced unit.

**Rationale**: Spec FR-008 / constitution: values may look like epoch dates (e.g. `1970-01-21`) while remaining match-relative. Treating `ts` as a date filter would corrupt Story 3. Asserting “epoch milliseconds” as a product type without tying it to schema inspection would over-encode the observation.

**Alternatives considered**: Parsing folder names into ISO dates for display (`2026-02-10`) — allowed as a label; the filter key remains the folder id.

---

## 7. Path simplification vs discrete events

**Decision**: Douglas-Peucker (or stride) MAY simplify `Position`/`BotPosition` polylines for draw/playback. `Kill`, `Killed`, `BotKill`, `BotKilled`, `Loot`, `KilledByStorm` MUST remain one marker each.

**Rationale**: FR-016 and Principle V. Simplifying discrete events would hide the Level-Designer signal.

---

## 8. Minimap assets

**Decision**: Pipeline writes WebP (or compressed JPEG) copies at 1024×1024 into the web public folder. Source PNGs/JPG (~3–12 MB) are never referenced by the app.

**Rationale**: FR-018, Principle V. Original Lockdown JPEG is ~11.8 MB.

---

## 9. Hosting and docs

**Decision**: Deploy the Vite `dist/` plus generated `data/` and compressed minimaps. README (stack, setup, env), `ARCHITECTURE.md` (flow, projection, assumptions, tradeoffs), `INSIGHTS.md` (three evidenced findings) are Quality Gate 8/9 deliverables, not in-app screens.

**Rationale**: Assignment submit checklist and constitution docs row.

**Alternatives considered**: Client-only GitHub Pages without generated data — would force browser Parquet (rejected in §1).

---

## 10. Out of scope (confirmed)

No live ingest, no auth, no mobile layout, no dual-match compare, no storm-radius reconstruction, no leaderboards. If a performance budget is missed, Story 7 failure behavior applies: optimize, simplify, or remove surface — do not ship a janky extra feature.

---

## 11. Research validation status

Observed dataset facts vs chosen implementation decisions. Ambiguous leftovers MUST be recorded in `ARCHITECTURE.md` (constitution: no silent guesswork).

| Item | Status |
|------|--------|
| Extensionless files are valid Parquet | Verified (representative files via `pyarrow`) |
| Actual Parquet schema (`user_id`, `match_id`, `map_id`, `x`, `y`, `z`, `ts`, `event`) | Verified |
| `event` encoding | Verified (`binary` / Python `bytes`, UTF-8 names such as `Position`) |
| UUID vs numeric actor shapes | Verified (filename + `user_id` samples) |
| Three map configurations (scale/origin from data README) | Verified (README); encoded as `contracts/map-config.json` |
| Ambrose projection fixture `(-301.45, -355.55) → (78, 890)` | Verified (data README) |
| `ts` physical type/unit | Verified: Parquet `timestamp[ms]`; semantically match-relative, not calendar |
| Five day folders; February 14 partial | Verified (folder layout + README) |
| Minimap file sizes ~3–12 MB | Verified (bytes on disk) |
| Corrupt-file skip + count | Required behavior (not yet observed as a live corrupt fixture) |
| 64×64 heatmap resolution | Design decision |
| Canvas 2D rendering | Design decision |
| Static host + generated JSON | Design decision |
| MapConfig as projection **parameter** source of truth | Design decision (constitution single-source-of-truth) |
| Two formula implementations (Python + TS) vs shared test vectors | Design decision |
| Unknown actor/event/map → diagnostics quarantine, not silent drop | Design decision (plan Phase 1) |
