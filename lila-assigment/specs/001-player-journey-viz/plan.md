# Implementation Plan: Player Journey Visualization

**Branch**: `001-player-journey-viz` | **Date**: 2026-08-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-player-journey-viz/spec.md`

**Note**: This plan turns the seven Feature Contracts into implementation phases. Each phase copies principle, gate, invariant, test, and failure behavior. `/speckit-tasks` will expand phases into tasks.md — this command does not create tasks.md.

## Summary

Level Designers need a hosted browser tool that places LILA BLACK journeys on the correct minimap, distinguishes humans from bots and event types, filters by map/day/match, plays a match in in-match time, and shows binned traffic/kill/death overlays — without parsing raw Parquet in the UI.

**Approach** (see [research.md](./research.md)): Python 3.11+ pipeline (`pyarrow`) writes canonical JSON index, per-match details, 64×64 heatmap bins, diagnostics quarantine, and compressed minimaps. Vite + React + TypeScript + Canvas 2D consumes those artifacts only. `map-config.json` is the single source of truth for **projection parameters**; Python and TypeScript each implement the documented formula and MUST pass shared `testVectors`. Static host (Vercel/Netlify) satisfies independent use.

```text
player_data/
     │
     ▼
Python ingestion
     ├── Normalize (decode, actor, ts, map validation)
     ├── Diagnostics quarantine (record-level; no silent drop)
     ├── Match reconstruction
     ├── Index generation
     ├── Heatmap bin generation
     └── optimized minimaps
             │
             ▼
       canonical artifacts
             │
             ▼
TypeScript web app (no Parquet)
     ├── filters → projection → canvas → playback → heatmaps
```

Pipeline (non-negotiable):

`Parquet → Normalize → Index/Reconstruct → Project → Filter → Visualize`

## Technical Context

**Language/Version**: Python 3.11+ (pipeline); TypeScript 5.x on Node 20 (web)

**Primary Dependencies**: pyarrow, Pillow, pytest (pipeline); Vite, React, Canvas 2D, Vitest (web)

**Storage**: Generated static JSON + WebP/JPEG minimaps under `web/public/` (source of truth remains `player_data/` Parquet)

**Testing**: pytest for ingest/decode/classify/reconstruct/skip; Vitest for `worldToPixel`, filters, playhead, heatmap bin rendering rules

**Target Platform**: Desktop browser; static public URL

**Project Type**: Web application (static frontend + build-time data pipeline)

**Performance Goals**: First meaningful map view from index + minimap only; filter interactions stay responsive; playback ≥ 30 FPS on a representative match; heatmaps from 64×64 bins

**Constraints**: UI MUST NOT read Parquet; silent fallback forbidden; February 14 labeled partial; discrete events never dropped; original 3–12 MB minimaps MUST NOT ship; missed performance budget ⇒ feature incomplete

**Scale/Scope**: ~1,243 journey files, ~89k events, 796 matches, 339 actors, 3 maps, 5 collection days; six user stories + one performance Feature Contract; no auth, no live ingest, no mobile polish

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial (pre-research) — PASS

| Principle / rule | Plan response |
|------------------|---------------|
| I Quality over quantity | Ship the six stories + performance; no extra analytics |
| I Pipeline boundary | UI consumes canonical JSON only |
| II Faithful telemetry | Decode, UUID/numeric, x/z projection, folder dates, match join, skip+count |
| III Test the contract | Projection and reconstruction tests before canvas (quickstart §§2–3) |
| IV Level-Designer UX | Filter chrome, visual language, playback, labeled overlays |
| V Performance budget | Index-first load, Canvas, bins, compressed assets, 30 FPS gate |
| Feature Contract cards | Copied into every implementation phase below |
| Build order | Inspection → canonical → projection → reconstruct → index → viz → playback → heatmaps → perf → host/docs |
| Silent fallback | Unknown map/event/empty filter/stale overlay → explicit states |
| Gate 8 docs | README, ARCHITECTURE.md, INSIGHTS.md in host/docs phase |

No unjustified complexity. Complexity Tracking table left empty.

### Post-design (after research.md, data-model.md, contracts/) — PASS

- Canonical event / index / match-detail / heatmap schemas exist; UI view-state forbids Parquet imports.
- **Authoritative projection parameters** live in `contracts/map-config.json` (copied into `index.json`). Python and TypeScript each implement the documented formula; they MUST pass shared `testVectors`. The JSON is not an executable function (Quality Gate 2).
- Heatmap schema is a 64×64 `counts` array (Story 5 aggregation invariant).
- Canonical Event has only the eight `eventKind` values and `human`/`bot` actors. Unknown/invalid rows are `QuarantineRecord` only (`data-model.md` boundary).
- MapConfig `scale`/`origin*` MUST equal `contracts/map-config.json`; not independently configurable.
- Reconstruction uses valid journeys only; conflicting remaining `mapId`/`collectionDay` → error/empty.
- Playhead and FilterState make stale canvas a spec violation.
- `ts` is match-relative; physical unit recorded from inspection (`timestamp[ms]`), not treated as calendar.
- Story 7 remains a completion gate, not a stretch goal.

Violations requiring justification: none.

## Implementation Phases (Feature Contract map)

Work MUST proceed in this order. Canvas phases MUST NOT start until Phases 0–4 have passing contract tests.

### Phase 0 — Repository / data inspection

**Pipeline step**: inspect data  
**Stories**: prerequisite for 1–7  
**Implementing**: Principle II  
**Contract**: On-disk Parquet schema matches `user_id, match_id, map_id, x, y, z, ts, event`; files have no `.parquet` suffix; five day folders; three minimaps  
**Test**: Open at least one file per day; record row counts, event-name samples, `ts` epoch-looking values, unreadable paths  
**Failure behavior**: Unreadable files listed, not ignored silently; inspection notes go to ARCHITECTURE.md if schema surprises appear  
**Does not**: Draw UI

### Phase 1 — Canonical data model (Stories 2 + 6 robustness)

**Pipeline step**: Normalize  
**Implementing**: Principle II + Quality Gate 3  
**Contract**: Bytes → UTF-8; UUID → human Event; digits → bot Event; eight event names only on Event; `collectionDay` from folder. Invalid rows never become Events.

**Canonical Event invariant** (MUST be tested): every Event has a valid actor (`human`|`bot`), valid `eventKind` (one of eight), valid `mapId` (MapConfig), and a `ts` whose unit matches recorded `tsUnit`.

```text
Raw row
   │
   ├── unreadable file ──────→ skipped + diagnostic
   │
   └── readable row
          │
          ├── invalid actor ─→ quarantine
          ├── invalid event ─→ quarantine
          ├── invalid map ───→ quarantine
          ├── invalid ts ────→ quarantine
          │
          └── valid ─────────→ canonical Event
                                  │
                                  ├── Journey
                                  ├── Match
                                  └── Heatmap
```

Quarantine is the destination. Silent discard is a defect. Canonical `Event.eventKind` has no `unknown`. Canonical `Actor.actorKind` is `human` \| `bot` only.

**Record isolation vs match-level failure**:

| Case | Behavior |
|------|----------|
| One (or more) records with unknown `mapId` / actor / event | Quarantine **those records**, increment the matching counter, continue. Remaining valid records still reconstruct. |
| Unreadable file | Skip file, count it, continue other files. Do not delete sibling journeys in the same match. |
| After quarantine, match still has valid records with one known `mapId` | Reconstruct and draw that match on that map. Partial-data from `loadReport`. |
| After quarantine, no remaining records, or remaining known `mapId`s conflict | Match/view MUST NOT render. Explicit empty/error. The match/view MUST NEVER use a stand-in map. |

One malformed record MUST NOT discard an otherwise reconstructable match.

**Test**: Fixtures for UUID, numeric id, each of eight event names, garbage bytes/name, unknown mapId, unreadable file, `ts` unit mismatch; skip/quarantine without abort; diagnostics counts match fixture size; a match with one bad `mapId` row still reconstructs from remaining valid rows; **no Event in MatchDetail violates the canonical Event invariant**  
**Failure behavior**: Invalid rows are QuarantineRecords + UI partial-data; never coerce; never an Event with `unknown` kind; never drop without a count  

**Diagnostics artifact** (`web/public/data/diagnostics.json`, see `contracts/diagnostics.schema.json`): `LoadReport` plus `quarantine[]`. File-level: unreadable file → `filesSkipped++`, no rows. Row-level: readable file + bad row → quarantine + `unknown*++`, remaining rows continue as Events. UI reads `loadReport` for partial-data; quarantine rows are not drawn.  

```
Implementing: Principle II + Quality Gate 3
Contract: UUID identity = human; numeric identity = bot; eight event names remain distinct after decode
Test: fixture identities and event names classify and render as specified; discrete events are not dropped
Failure behavior: unknown event type is an explicit state, never coerced into another marker
```

### Phase 2 — Projection module (Story 1)

**Pipeline step**: Project  
**Implementing**: Principle II + Quality Gate 2  

```
Implementing: Principle II + Quality Gate 2
Contract: map identity → {map image, scale, origin}; world (x, z) → image pixel; y is elevation only
Test: documented world coordinate → expected pixel coordinate on each of the three maps
Failure behavior: explicit error/empty state, never silent fallback to another map
```

Deliver TypeScript `worldToPixel(mapConfig, x, z)` that **only** reads MapConfig from `contracts/map-config.json` / `index.json`. Python heatmap binning reads the same file; it MUST NOT define a second origin/scale table. Tests use `testVectors` in that artifact. **No canvas yet.**

### Phase 3 — Match reconstruction (Story 3 join)

**Pipeline step**: Reconstruct  
**Implementing**: Principle IV + Quality Gate 4 (match view invariant)  
**Contract**: **Reconstruction invariant** — a Match is built from all valid journeys sharing the exact `matchId`; quarantined records never participate. Sort remaining Events by `ts`. Map/`collectionDay` are the consensus of remaining valid journeys.  
**Test**: Two fixture files, same match, merged order; discrete event still present after join; third fixture row with unknown `mapId` is a QuarantineRecord and does not drop the match; unknown event name is quarantined and is absent from MatchDetail.events  
**Failure behavior**: If remaining valid journeys have conflicting known `mapId` or `collectionDay`, or zero valid journeys remain, match/view is empty/error — never a stand-in map. Partial-data via `loadReport`.  

### Phase 4 — Index and pre-aggregation (Stories 3, 5 bins, 7 first view)

**Pipeline step**: Index  
**Implementing**: Principle V + Quality Gates 7 and 9 (load shape); Principle IV + Gate 4 (day keys); Principle V heatmap bins  

```
Implementing: Principle V + Quality Gates 7 and 9
Contract: first meaningful map view does not require loading the full five-day archive; filtering remains responsive; playback targets ≥30 FPS on a representative match; heatmaps use aggregated bins; discrete events are preserved
Test: measure initial-load work, filter interaction, representative-match playback frame rate, and heatmap rendering on the production-sized dataset
Failure behavior: if a performance budget is missed, the feature is not considered complete; optimize, reduce/simplify the implementation, or remove the offending surface
```

Emit `index.json`, per-match `detailPath`, 64×64 `traffic`/`kill`/`death` grids, compressed minimaps. February 14 `partialDay: true`.

### Phase 5 — Visualization (Stories 1, 2, 3)

**Pipeline step**: Filter → Visualize  

Chrome + Canvas paths/markers. Consume index + selected MatchDetail + `worldToPixel`. Visual language from `contracts/ui-view-state.md`. Filters in one place; empty subset clears canvas. Tasks in this phase MUST copy the cards below.

**Story 1 — map placement**

```
Implementing: Principle II + Quality Gate 2
Contract: map identity → {map image, scale, origin}; world (x, z) → image pixel; y is elevation only
Test: documented world coordinate → expected pixel coordinate on each of the three maps
Failure behavior: explicit error/empty state, never silent fallback to another map
```

**Story 2 — actors and events**

```
Implementing: Principle II + Quality Gate 3
Contract: UUID identity = human; numeric identity = bot; eight event names remain distinct after decode
Test: fixture identities and event names classify and render as specified; discrete events are not dropped
Failure behavior: unknown event type is an explicit state, never coerced into another marker
```

**Story 3 — filters**

```
Implementing: Principle IV + Quality Gate 4
Contract: calendar date = collection day folder; match view = all participants sharing that match, ordered by in-match time
Test: map/date/match filters isolate the intended subset; February 14 is labeled partial
Failure behavior: empty filter result is an empty state, never a stale canvas
```

### Phase 6 — Playback (Story 4)

```
Implementing: Principle IV + Quality Gate 5
Contract: playhead position = in-match time; visible events and paths are those with time ≤ playhead
Test: pause mid-match hides later events; play resumes in time order
Failure behavior: no match selected → disabled/empty timeline, never a broken control
```

`requestAnimationFrame`; no DOM node per sample.

### Phase 7 — Heatmaps (Story 5)

```
Implementing: Principle IV + Principle V + Quality Gate 6
Contract: traffic / kill / death overlays are independent, labeled, and scoped to the active filter set; heatmaps operate on aggregated spatial bins; raw movement samples are never rendered as individual heatmap DOM nodes
Test: toggling one overlay does not hide the others; filter change replaces the overlay data; heatmap drawing uses bins, not one node per Position/BotPosition sample
Failure behavior: no samples for an overlay → empty overlay state, never a leftover heatmap
```

### Phase 8 — Performance pass (Story 7)

Re-run Story 7 card on production-sized output. Path simplify movement only. Confirm 30 FPS. **If missed, not complete.**

### Phase 9 — Hosted use + docs (Story 6 + Gates 8–9)

```
Implementing: Principle II + Principle IV + Quality Gate 9
Contract: a public link is sufficient to use the tool (Quality Gate 9); unreadable files are skipped and counted (Principle II)
Test: open the link on a clean machine and complete the core flows; corrupt files do not abort the session
Failure behavior: load/error/partial states are explicit; the tool does not crash on bad files
```

Plus Quality Gate 8: `ARCHITECTURE.md` (including projection and assumptions), `README`, `INSIGHTS.md`.

### Phase 10 — Final Quality Gate review

Walk Gates 1–9 against the hosted URL using [quickstart.md](./quickstart.md) §§5–7.

## Project Structure

### Documentation (this feature)

```text
specs/001-player-journey-viz/
├── plan.md              # This file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── projection.md
│   ├── ui-view-state.md
│   ├── map-config.json          # authoritative projection parameters
│   ├── map-config.schema.json
│   ├── diagnostics.schema.json  # quarantine; unknown rows are not silent-dropped
│   ├── canonical-event.schema.json
│   ├── match-index.schema.json
│   ├── match-detail.schema.json
│   └── heatmap-bins.schema.json
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
pipeline/
├── src/
│   ├── inspect.py
│   ├── normalize.py      # decode event, classify actor, attach collectionDay
│   ├── reconstruct.py
│   ├── project.py        # bins from MapConfig (no local scale/origin table)
│   ├── index.py          # day → map → match + LoadReport; embeds MapConfig
│   ├── heatmap.py        # 64×64 bins using MapConfig projection
│   ├── assets.py         # compress minimaps
│   └── build.py
└── tests/
    ├── test_normalize.py
    ├── test_projection.py
    ├── test_reconstruct.py
    └── test_index.py

web/
├── public/
│   ├── data/             # generated index + matches + heatmaps
│   └── minimaps/         # compressed assets only
├── src/
│   ├── domain/           # types, worldToPixel(mapConfig), filters, playhead — no Parquet
│   ├── viz/              # Canvas renderer (paths, markers, bins, playback)
│   └── ui/               # filter chrome, legend, timeline, overlay toggles
└── tests/
    └── domain/

player_data/              # source Parquet + original minimaps (pipeline input)
README.md
ARCHITECTURE.md
INSIGHTS.md
```

**Structure Decision**: Split pipeline vs web so the UI cannot import Parquet (Principle I). Domain tests live next to `worldToPixel` so Gate 2 stays independent of React. Generated `web/public/data` is build output; commit a generated snapshot if the host has no Python, or generate in CI before deploy.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. Two languages (Python ETL + TypeScript UI) are the minimum that keeps Parquet out of the browser without a Streamlit-quality UX regression.
