# Quickstart validation

Prove the six user stories + one performance Feature Contract without waiting for `/speckit-implement`. Commands below are the intended interface; `/speckit-tasks` will flesh out file-level work.

## Prerequisites

- Python 3.11+
- Node.js 20+
- `player_data/` present with day folders and `minimaps/`
- Contracts in `specs/001-player-journey-viz/contracts/`

## 1. Pipeline: inspect → canonical → index

From repo root (after tasks create `pipeline/`):

```text
python -m pytest pipeline/tests -q
python -m pipeline.build --source player_data --out web/public/data
```

**Expected**:

- Unreadable files increment `loadReport.filesSkipped` and do not abort.
- Unknown actor/event/map rows are `QuarantineRecord`s in `diagnostics.json` (not canonical Events) and do not abort.
- Unreadable files increment `filesSkipped` (file-level) separately from row-level `unknown*` counts.
- `index.json` validates against `contracts/match-index.schema.json`.
- February 14 has `partialDay: true`.
- No `ts` used as a calendar key.
- `web/public/minimaps/` contains compressed 1024×1024 assets, not the 3–12 MB originals.

**Contracts covered**: Story 2 (decode/classify), Story 3 (day folders), Story 6 (skip+count), performance Feature Contract (index without shipping raw archive to the client).

## 2. Projection tests (before any canvas)

```text
python -m pytest pipeline/tests/test_projection.py -q
npx vitest run web/src/domain/worldToPixel.test.ts
```

**Expected**: Tests load `contracts/map-config.json` `testVectors` (not hardcoded scale/origin). Ambrose Valley `(-301.45, -355.55)` → `(78, 890)` ±1 px; unknown `mapId` fails closed.

**Contract**: Story 1 / Quality Gate 2.

## 3. Reconstruction tests

```text
python -m pytest pipeline/tests/test_reconstruct.py -q
```

**Expected**: Files sharing `matchId` become one `MatchDetail` sorted by `ts`; discrete events retained. A single unknown-`mapId` record is quarantined and does not discard the match. Conflicting **known** maps, or a match with no valid rows left, is an error/empty view — never a stand-in map.

**Contract**: Story 3 reconstruction.

## 4. Domain filters and playhead (no Parquet in `web/`)

```text
npx vitest run web/src/domain
```

**Expected**: `web/src` has no Parquet dependency. Filter helper isolates map/day/match. Playhead `ts <= t` hides later events. Heatmap helper consumes 64×64 bins only.

**Contracts**: Stories 3–5, plus the performance Feature Contract (no full-archive parse in UI).

## 5. Local UI walkthrough

```text
cd web
npm run dev
```

Default: Ambrose Valley + February 10. Then:

| Step | Expect |
|------|--------|
| Select a match | Correct minimap; paths on image |
| Humans vs bots | Distinct without legend-only |
| Event markers | Kill, death, loot, storm distinct |
| Change map/day/match | Canvas, playback, heatmaps follow; empty combo is empty |
| Play / pause | Playhead visible; pause hides later events |
| Heatmap toggles | Independent labels; bins not per-sample DOM nodes |
| February 14 | Partial label |
| Partial-data | When `diagnostics.json` has non-zero quarantine/skip counts, the UI indicates partial data; the session remains usable |

## 6. Performance gate (performance Feature Contract)

On a **representative** match (not a toy file):

- First view: network/work is `index.json` + minimap + chrome — not every journey file.
- Filter change does not freeze the page.
- Playback ≥ 30 FPS (Chrome performance panel or equivalent).
- If any budget fails: **not complete** — optimize, simplify, or remove surface.

## 7. Hosted review (Story 6 + Gate 9)

Deploy `web` dist + `public/data` + compressed minimaps. Open the public URL on a machine without this repo. Repeat the walkthrough in §5.

Partial-data state: when `diagnostics.json` contains non-zero quarantine/skip counts, the UI explicitly indicates partial data; the session remains usable.

Quality Gate 8 docs (`README`, `ARCHITECTURE.md`, `INSIGHTS.md`) must exist before calling the feature done.

## Mapping to constitution pipeline

Do not start §5 until §1–§3 pass. That is the operationalization of:

`Parquet → Normalize → Index/Reconstruct → Project → Filter → Visualize`
