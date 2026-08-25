# Tasks: Player Journey Visualization

**Input**: Design documents from `/specs/001-player-journey-viz/`

**Prerequisites**: plan.md (frozen), spec.md, research.md, data-model.md (frozen), contracts/

**Tests**: Required by constitution Principle III and Feature Contracts. Write listed tests first; they MUST fail before implementation.

**Architecture**: Do not reopen. UI MUST NOT read Parquet. `contracts/map-config.json` is the only projection-parameter source. Canonical Event has eight `eventKind` values and `human`|`bot` only. Unknown/invalid rows → `QuarantineRecord`.

**Organization**: Setup → Foundational (plan phases 0–4; blocks canvas) → user stories in spec priority → performance Feature Contract → polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US6 from spec.md; FC7 = performance Feature Contract (not a user story)
- Every task includes a file path
- Each story phase copies its Feature Contract card unchanged

## Path Conventions

- Pipeline: `pipeline/src/`, `pipeline/tests/`
- Web: `web/src/domain/`, `web/src/viz/`, `web/src/ui/`, `web/src/domain/*.test.ts`
- Generated artifacts: `web/public/data/`, `web/public/minimaps/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project skeleton only. No canvas. No Parquet in `web/`.

- [ ] T001 Create directories `pipeline/src/`, `pipeline/tests/`, `web/src/domain/`, `web/src/viz/`, `web/src/ui/`, `web/public/data/`, `web/public/minimaps/` per `specs/001-player-journey-viz/plan.md`
- [ ] T002 Initialize Python 3.11+ project with `pyarrow`, `Pillow`, `pytest` in `pipeline/pyproject.toml`
- [ ] T003 [P] Initialize Vite + React + TypeScript + Vitest in `web/package.json` and `web/vite.config.ts`
- [ ] T004 [P] Add `web/.gitignore` entries so `web/src` cannot add Parquet readers; ignore raw `player_data/minimaps` from the web public tree
- [ ] T005 Load `specs/001-player-journey-viz/contracts/map-config.json` from that canonical contract path in `pipeline/src/map_config.py`; do not duplicate scale/origin/image-size literals or create an independently maintained copy

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Plan phases 0–4. **CRITICAL**: No user-story canvas work until this phase’s tests pass.

**⚠️ No user story implementation until this checkpoint.**

### Inspection (plan Phase 0) — Principle II

- [ ] T006 Write inspection notes for schema, `event` bytes, `ts` as `timestamp[ms]`, five day folders, and unreadable-file policy in `pipeline/src/inspect.py` (read-only over `player_data/`)
- [ ] T007 Record inspection findings that belong in docs later (no guessing) as comments or a stub list in `pipeline/src/inspect.py`

### Tests first — Principle III

- [ ] T008 Write failing tests for UTF-8 event decode, UUID vs numeric actor, eight event names, unknown → quarantine (not Event) in `pipeline/tests/test_normalize.py`
- [ ] T009 [P] Write failing tests loading `testVectors` from `specs/001-player-journey-viz/contracts/map-config.json` (Ambrose interior `inBounds: true`; origin vectors `(0, 1024)` with `inBounds: false`; pixels ±1, do not clamp) in `pipeline/tests/test_projection.py`
- [ ] T010 [P] Write failing Vitest `worldToPixel` tests loading the same `map-config.json` `testVectors` in `web/src/domain/worldToPixel.test.ts`
- [ ] T011 [P] Write failing reconstruction tests in `pipeline/tests/test_reconstruct.py`: join by `matchId`; events sorted ascending by `ts`; all events validate as CanonicalEvent; quarantine unknown-map row does not drop the match; conflicting known maps → error; `tsMin == min(events.ts)`; `tsMax == max(events.ts)`; `tsMin <= tsMax`; `humanCount` == distinct human `userId`s; `botCount` == distinct bot `userId`s (not event counts)
- [ ] T012 [P] Write failing tests that no Event in a MatchDetail violates the canonical Event invariant in `pipeline/tests/test_canonical_event.py`
- [ ] T013 [P] Write failing tests for `filesSkipped` vs row-level `unknown*` and always-written `diagnostics.json` in `pipeline/tests/test_diagnostics.py`

### Normalize + quarantine — Principle II + Quality Gate 3

```
Implementing: Principle II + Quality Gate 3
Contract: UUID identity = human; numeric identity = bot; eight event names remain distinct after decode
Test: fixture identities and event names classify and render as specified; discrete events are not dropped
Failure behavior: unknown actor/event/map rows become QuarantineRecord; they are never coerced into canonical Event fields or visualization markers
```

- [ ] T014 Implement raw-row split (unreadable file vs invalid actor/event/map/`ts` vs Event) in `pipeline/src/normalize.py`
- [ ] T015 Implement `QuarantineRecord` writer and counters in `pipeline/src/diagnostics.py` per `specs/001-player-journey-viz/contracts/diagnostics.schema.json`
- [ ] T016 Make T008 and T013 pass without coercing unknown into Event fields in `pipeline/src/normalize.py` and `pipeline/src/diagnostics.py`

### Projection — Story 1 card / Quality Gate 2

```
Implementing: Principle II + Quality Gate 2
Contract: map identity → {map image, scale, origin}; world (x, z) → image pixel; y is elevation only
Test: documented world coordinate → expected pixel coordinate on each of the three maps
Failure behavior: explicit error/empty state, never silent fallback to another map
```

- [ ] T017 Implement Python bin projection using **only** loaded MapConfig (no second origin/scale table) in `pipeline/src/project.py`
- [ ] T018 Implement `worldToPixel(mapConfig, x, z)` reading MapConfig only in `web/src/domain/worldToPixel.ts`
- [ ] T019 Make T009 and T010 pass; unknown `mapId` fails closed in `pipeline/src/project.py` and `web/src/domain/worldToPixel.ts`

### Reconstruct — Story 3 join

- [ ] T020 Implement match join from **valid** journeys only in `pipeline/src/reconstruct.py`
- [ ] T021 Make T011 and T012 pass in `pipeline/src/reconstruct.py` (quarantined rows never participate; match/view MUST NEVER use a stand-in map)

### Index, heatmaps, assets — Principle V + Gates 7/9

```
Implementing: Principle V + Quality Gates 7 and 9
Contract: first meaningful map view does not require loading the full five-day archive; filtering remains responsive; playback targets ≥30 FPS on a representative match; heatmaps use aggregated bins; discrete events are preserved
Test: measure initial-load work, filter interaction, representative-match playback frame rate, and heatmap rendering on the production-sized dataset
Failure behavior: if a performance budget is missed, the feature is not considered complete; optimize, reduce/simplify the implementation, or remove the offending surface
```

- [ ] T022 Emit `index.json` (`collectionDay` → `mapId` → `matchId`, `tsUnit`, `quarantinePath`) with MapConfig parameters embedded from the canonical `specs/001-player-journey-viz/contracts/map-config.json`; web consumes this embedded MapConfig rather than maintaining its own map constants, in `pipeline/src/index.py` per `specs/001-player-journey-viz/contracts/match-index.schema.json`
- [ ] T023 [P] Emit per-match `MatchDetail` JSON (canonical Events only) in `pipeline/src/index.py` per `specs/001-player-journey-viz/contracts/match-detail.schema.json`
- [ ] T024 [P] Write failing then passing heatmap bin tests in `pipeline/tests/test_heatmap.py` and emit grids in `pipeline/src/heatmap.py` per `specs/001-player-journey-viz/contracts/heatmap-bins.schema.json`. Invariants: `columns == 64`; `rows == 64`; `counts.length == 4096`; `maxCount == max(counts)`; `maxCount == 0` iff all counts are 0; exactly one grain (`dayId` set XOR `matchId` set). Overlay mapping from canonical Events only: traffic ← `Position` + `BotPosition`; kill ← `Kill` + `BotKill`; death ← `Killed` + `BotKilled` + `KilledByStorm`. Loot must not increment any overlay. Quarantined rows must not increment bins.
- [ ] T025 [P] Write compressed 1024×1024 minimaps to `web/public/minimaps/` (never the 3–12 MB originals) in `pipeline/src/assets.py`
- [ ] T026 Wire `python -m pipeline.build --source player_data --out web/public/data` in `pipeline/src/build.py`
- [ ] T027 Make T013 pass and verify `web/public/data/diagnostics.json` is emitted on every build, including zero-count clean builds, via `pipeline/src/build.py`

**Checkpoint**: Foundation ready. `pytest pipeline/tests` and `npx vitest run web/src/domain/worldToPixel.test.ts` pass. Canvas work may start.

---

## Phase 3: User Story 1 - See journeys on the correct map (Priority: P1) 🎯 MVP

**Goal**: Designer selects a match and sees paths on the correct minimap with documented world→pixel placement.

**Independent Test**: Open one known match on each of the three maps; Ambrose fixture lands near pixel (78, 890).

```
Implementing: Principle II + Quality Gate 2
Contract: map identity → {map image, scale, origin}; world (x, z) → image pixel; y is elevation only
Test: documented world coordinate → expected pixel coordinate on each of the three maps
Failure behavior: explicit error/empty state, never silent fallback to another map
```

### Tests

- [ ] T028 [P] [US1] Add failing index-loading/default-selection tests (default Ambrose Valley + February 10, match list from `index.json` only) in `web/src/domain/filters.test.ts`

### Implementation

- [ ] T029 [US1] Load `web/public/data/index.json` (no Parquet) in `web/src/domain/indexLoader.ts`
- [ ] T030 [US1] Draw compressed minimap + projected paths via `worldToPixel` on Canvas in `web/src/viz/mapCanvas.ts`
- [ ] T031 [US1] Wire default landing and match selection chrome in `web/src/ui/App.tsx`
- [ ] T032 [US1] Show explicit empty/error when a match cannot be reconstructed; MUST NEVER use a stand-in map in `web/src/ui/EmptyErrorStates.tsx`

**Checkpoint**: US1 independently testable on `npm run dev`.

---

## Phase 4: User Story 2 - Tell humans, bots, and event types apart (Priority: P1)

**Goal**: Humans vs bots are visually distinct without legend-only; kill/death/loot/storm markers are distinct and stable across maps.

**Independent Test**: Open a match with mixed actors and discrete events; tell classes apart without reading a caption.

```
Implementing: Principle II + Quality Gate 3
Contract: UUID identity = human; numeric identity = bot; eight event names remain distinct after decode
Test: fixture identities and event names classify and render as specified; discrete events are not dropped
Failure behavior: unknown event type is an explicit state, never coerced into another marker
```

### Tests

- [ ] T033 [P] [US2] Add failing visual-language unit tests (human vs bot stroke/color; six discrete markers; movement not mixed with markers) in `web/src/viz/visualLanguage.test.ts`

### Implementation

- [ ] T034 [US2] Encode visual language from `specs/001-player-journey-viz/contracts/ui-view-state.md` in `web/src/viz/visualLanguage.ts`
- [ ] T035 [US2] Draw human/bot paths and discrete markers on Canvas (no one-DOM-node-per-sample) in `web/src/viz/mapCanvas.ts`
- [ ] T036 [US2] Show `loadReport` partial-data when quarantine counts > 0 in `web/src/ui/PartialDataBanner.tsx`
- [ ] T037 [US2] Make T033 pass; never coerce unknown into a marker in `web/src/viz/mapCanvas.ts`

**Checkpoint**: US1 + US2 independently testable.

---

## Phase 5: User Story 3 - Filter by map, date, and match (Priority: P1)

**Goal**: Stable map/day/match filters; calendar = folder; February 14 partial; empty subset clears canvas.

**Independent Test**: Change map, date, match; canvas/playback/heatmaps follow; empty combo is empty.

```
Implementing: Principle IV + Quality Gate 4
Contract: calendar date = collection day folder; match view = all participants sharing that match, ordered by in-match time
Test: map/date/match filters isolate the intended subset; February 14 is labeled partial
Failure behavior: empty filter result is an empty state, never a stale canvas
```

### Tests

- [ ] T038 [P] [US3] Add failing tests that filters key `dayId` not `ts`, February 14 is partial, empty subset clears selection in `web/src/domain/filters.test.ts`

### Implementation

- [ ] T039 [US3] Implement `FilterState` (reset canvas/playhead/heatmap together) in `web/src/domain/filters.ts`
- [ ] T040 [US3] Place map, day, match controls in a stable chrome location in `web/src/ui/FilterBar.tsx`
- [ ] T041 [US3] Label February 14 partial in `web/src/ui/FilterBar.tsx`
- [ ] T042 [US3] On empty subset, show empty state and clear canvas in `web/src/ui/EmptyErrorStates.tsx`
- [ ] T043 [US3] Make T028 and T038 pass in `web/src/domain/filters.ts`

**Checkpoint**: US1–US3 independently testable.

---

## Phase 6: User Story 4 - Watch a match unfold (Priority: P2)

**Goal**: Play/pause/playhead; visible geometry is `ts <= t`; disabled without a match.

**Independent Test**: Play, pause mid-match, confirm later events hidden; resume in order.

```
Implementing: Principle IV + Quality Gate 5
Contract: playhead position = in-match time; visible events and paths are those with time ≤ playhead
Test: pause mid-match hides later events; play resumes in time order
Failure behavior: no match selected → disabled/empty timeline, never a broken control
```

### Tests

- [ ] T044 [P] [US4] Add failing playhead tests (`tsMin ≤ t ≤ tsMax`, visible set `ts <= t`, null match → disabled) in `web/src/domain/playhead.test.ts`

### Implementation

- [ ] T045 [US4] Implement playhead state in `web/src/domain/playhead.ts`
- [ ] T046 [US4] Drive Canvas with `requestAnimationFrame` (no DOM node per sample) in `web/src/viz/playback.ts`
- [ ] T047 [US4] Add play/pause/playhead chrome in `web/src/ui/Timeline.tsx`
- [ ] T048 [US4] Make T044 pass; disable timeline when no match in `web/src/ui/Timeline.tsx`

**Checkpoint**: US4 independently testable.

---

## Phase 7: User Story 5 - Inspect kill, death, and traffic heatmaps (Priority: P2)

**Goal**: Independent labeled overlays from precomputed 64×64 bins as Canvas ImageData, never per-sample DOM nodes.

**Independent Test**: Toggle each overlay alone and together; filter change replaces overlay data.

```
Implementing: Principle IV + Principle V + Quality Gate 6
Contract: traffic / kill / death overlays are independent, labeled, and scoped to the active filter set; heatmaps operate on aggregated spatial bins; raw movement samples are never rendered as individual heatmap DOM nodes
Test: toggling one overlay does not hide the others; filter change replaces the overlay data; heatmap drawing uses bins, not one node per Position/BotPosition sample
Failure behavior: no samples for an overlay → empty overlay state, never a leftover heatmap
```

### Tests

- [ ] T049 [P] [US5] Add failing tests that heatmap draw uses `counts` length 4096 only (no per-sample nodes) in `web/src/viz/heatmapLayer.test.ts`

### Implementation

- [ ] T050 [US5] Load map+day or per-match bin JSON in `web/src/domain/heatmapLoader.ts`
- [ ] T051 [US5] Rasterize bins to Canvas `ImageData` in `web/src/viz/heatmapLayer.ts`
- [ ] T052 [US5] Independent labeled toggles (traffic, kill, death) in `web/src/ui/HeatmapToggles.tsx`
- [ ] T053 [US5] Empty overlay when `maxCount === 0`; clear leftover on filter change in `web/src/viz/heatmapLayer.ts`
- [ ] T054 [US5] Make T049 pass in `web/src/viz/heatmapLayer.ts`

**Checkpoint**: US5 independently testable.

---

## Phase 8: Performance Feature Contract (FC7)

**Goal**: First view from index + minimap; filters responsive; ≥30 FPS on a representative match; discrete events preserved. Missed budget ⇒ not complete.

```
Implementing: Principle V + Quality Gates 7 and 9
Contract: first meaningful map view does not require loading the full five-day archive; filtering remains responsive; playback targets ≥30 FPS on a representative match; heatmaps use aggregated bins; discrete events are preserved
Test: measure initial-load work, filter interaction, representative-match playback frame rate, and heatmap rendering on the production-sized dataset
Failure behavior: if a performance budget is missed, the feature is not considered complete; optimize, reduce/simplify the implementation, or remove the offending surface
```

- [ ] T055 [FC7] Confirm first paint fetches `index.json` + minimap only (not every match file) in `web/src/domain/indexLoader.ts`
- [ ] T056 [FC7] Simplify `Position`/`BotPosition` polylines only (never drop discrete events) in `web/src/viz/pathSimplify.ts`
- [ ] T057 [FC7] Measure representative-match playback FPS; if < 30, optimize or remove surface in `web/src/viz/playback.ts` (do not ship a missed budget)
- [ ] T058 [FC7] Measure heatmap rendering and filter-replacement performance using production-sized 64×64 bins; overlays MUST stay responsive and use aggregated bins only in `web/src/viz/heatmapLayer.ts`

**Checkpoint**: Story 7 failure behavior enforced locally. Repeat first-paint, filter, playback FPS, and heatmap measurements against the hosted build in T065.

---

## Phase 9: User Story 6 - Use the tool without the author (Priority: P1)

**Goal**: Public URL; explicit load/empty/partial/error; unreadable files already counted in diagnostics.

**Independent Test**: Open the hosted URL on a machine without this repo; complete map, filter, playback, heatmap flows.

```
Implementing: Principle II + Principle IV + Quality Gate 9
Contract: a public link is sufficient to use the tool (Quality Gate 9); unreadable files are skipped and counted (Principle II)
Test: open the link on a clean machine and complete the core flows; corrupt files do not abort the session
Failure behavior: load/error/partial states are explicit; the tool does not crash on bad files
```

- [ ] T059 [US6] Add loading state distinct from blank canvas in `web/src/ui/EmptyErrorStates.tsx`
- [ ] T060 [US6] Configure static deploy of `web/dist` + `web/public/data` + compressed minimaps (Vercel or Netlify config at `web/`)
- [ ] T061 [US6] Record the public URL in `README.md`

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Quality Gates 8–9 docs and quickstart walkthrough. No new product surface.

- [ ] T062 [P] Write `README.md` (stack, setup, env, public URL)
- [ ] T063 [P] Write `ARCHITECTURE.md` (pipeline, MapConfig SSOT, projection formula, assumptions, tradeoffs, inspection notes)
- [ ] T064 [P] Write `INSIGHTS.md` (three evidenced findings)
- [ ] T065 Run `specs/001-player-journey-viz/quickstart.md` §§1–7 as the final Gate 1–9 acceptance, including repeating FC7 first-paint/filter/playback/heatmap measurements on the **hosted** URL; record results in `specs/001-player-journey-viz/checklists/quality-gates.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user-story canvas**
- **US1 (Phase 3)**: After Foundational — MVP
- **US2–US3 (Phases 4–5)**: After US1 recommended (same canvas); independently testable
- **US4–US5 (Phases 6–7)**: After US1–US3 (need match view + filters)
- **FC7 (Phase 8)**: After US4–US5 (measure real playback/heatmaps)
- **US6 (Phase 9)**: After a working local tool (host the same surface)
- **Polish (Phase 10)**: After US6 or in parallel with T062–T064 once architecture is stable. **T065 is the final Gate 1–9 validation.**

### User Story Dependencies

- **US1 (P1)**: After Foundational only
- **US2 (P1)**: After US1 canvas exists
- **US3 (P1)**: After index loader (T029); can proceed beside US2 if `FilterBar` stays in its own files
- **US4 (P2)**: After US1 paths exist
- **US5 (P2)**: After T024 bins exist; UI can proceed beside US4 (`heatmapLayer.ts` vs `playback.ts`)
- **US6 (P1)**: After core flows exist locally
- **FC7**: After playback + heatmaps exist

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Domain before viz before chrome
- Story complete before treating the Feature Contract as done

### Parallel Opportunities

- T003/T004; T009/T010/T011/T012/T013 after T008 fixtures exist
- T023/T024/T025 after reconstruct
- T033 vs T038 vs T044 vs T049 once foundation + US1 exist (different files)
- T062/T063/T064 in parallel

---

## Parallel Example: Foundational tests

```bash
# After T008 fixtures exist:
Task: "T009 pipeline projection tests in pipeline/tests/test_projection.py"
Task: "T010 Vitest worldToPixel in web/src/domain/worldToPixel.test.ts"
Task: "T011 reconstruct tests in pipeline/tests/test_reconstruct.py"
Task: "T012 canonical Event invariant in pipeline/tests/test_canonical_event.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup
2. Phase 2 Foundational until pytest + Vitest projection/normalize/reconstruct pass
3. Phase 3 US1 — paths on the correct map
4. **STOP and VALIDATE** US1 independent test
5. Then US2 markers, US3 filters (still P1)

### Incremental Delivery

1. Setup + Foundational → no canvas yet
2. US1 → mapped journeys (MVP)
3. US2 → actors/events
4. US3 → filters
5. US4 → playback
6. US5 → heatmaps
7. FC7 → performance gate (fail = not complete)
8. US6 + docs → hosted review

### Parallel Team Strategy

1. Together: Setup + Foundational
2. Then: A = US1/US2 canvas, B = US3 filters, C = heatmap JSON already built in foundation so US5 UI can start after T024

---

## Notes

- Do not change Feature Contract cards
- Do not put Parquet in `web/`
- Do not hardcode MapConfig scale/origin
- Do not ship if FC7 FPS/load budgets miss
- Commit after each task or logical group
- Format: checkbox, Task ID, optional [P], optional [Story], description with path
