<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0
- Modified principles: I. Quality Over Quantity (pipeline boundary made
  explicit: UI MUST NOT consume raw Parquet)
- Added sections: Feature Contract; Pipeline & Build Order
- Removed sections: none
- Follow-up TODOs: none
-->

# LILA Player Journey Visualization Constitution

## Core Principles

### I. Quality Over Quantity
A feature ships complete, correct, and usable — or it does not ship.
Half-working filters, broken playback, or a heatmap that cannot be
interpreted MUST NOT be treated as done. Prefer four polished,
end-to-end capabilities over ten incomplete ones.

Code MUST follow the pipeline
`Parquet → Normalize → Index/Reconstruct → Project → Filter → Visualize`.
Visualization and UI code MUST consume the canonical/normalized model
only. They MUST NOT parse, decode, or interpret raw Parquet records.
Coordinate mapping MUST live in a pure, documented `worldToPixel()`
function with a single source of truth for per-map `scale`, `origin_x`,
and `origin_z`. Ambiguous data MUST be resolved with an explicit
assumption recorded in `ARCHITECTURE.md`; silent guesswork is a defect.

Rationale: The assignment evaluates system design, attention to detail,
and code quality — not feature count. The pipeline boundary is what
keeps a visually impressive dashboard from getting telemetry semantics
wrong.

### II. Faithful Telemetry Rendering
Every visual on the minimap MUST be a faithful projection of the parquet
schema. The pipeline MUST:

- Read files as Apache Parquet even when they have no `.parquet` extension
  (`{user_id}_{match_id}.nakama-0`).
- Decode `event` from bytes to UTF-8 before classification or display.
- Treat UUID `user_id` values as humans and short numeric IDs as bots.
- Map world `(x, z)` to minimap pixels; `y` is elevation and MUST NOT be
  used as a 2D map axis.
- Keep `ts` as match-relative time (values look like epoch dates such as
  `1970-01-21`); ordering is within a `match_id`, not wall-clock calendar
  time. Calendar date for filters comes from the day folder
  (`February_10` … `February_14`), not from `ts`.
- Use the correct minimap and config for `map_id`: AmbroseValley
  (scale 900, origin -370, -473), GrandRift (581, -290, -290),
  Lockdown (1000, -500, -500). Images are 1024×1024; V is flipped
  (`pixel_y = (1 - v) * 1024`).
- Reconstruct a match by joining every file that shares the same
  `match_id`, then sorting by `ts`.

Unreadable parquet files MUST be skipped and counted, not crash the
tool. February 14 is a partial day and MUST be labeled as such — never
presented as a complete 24-hour sample.

Rationale: Coordinate mapping, byte encoding, bot detection, and
timestamp semantics are the assignment's attention-to-detail test.

### III. Test the Contract, Then the Canvas
Tests are non-negotiable for the data contract. Implementation of
projection, classification, or aggregation MUST NOT land without
automated tests that would fail if the mapping were wrong.

Required coverage:

- World-to-pixel conversion for all three maps, including the README
  AmbroseValley example: world `(-301.45, -355.55)` → pixel
  approximately `(78, 890)`.
- Human vs bot classification from `user_id` shape.
- `event` byte decoding and the eight event types: `Position`,
  `BotPosition`, `Kill`, `Killed`, `BotKill`, `BotKilled`,
  `KilledByStorm`, `Loot`.
- Match reconstruction (same `match_id` across files) and `ts` ordering.
- Filters by map, date folder, and match isolate the intended subset.
- Corrupt or unreadable files are skipped without aborting the load.
- February 14 is treated as partial in any day-level summary.

UI tests SHOULD cover empty states, filter combinations, and playback
controls. Visual polish MAY be reviewed manually; coordinate math MUST
be asserted in code.

Rationale: A polished canvas with wrong coordinates is a failed tool.
Tests make the tricky mapping reviewable and regression-proof.

### IV. Level-Designer UX Consistency
The primary user is a Level Designer, not a data scientist. The UI MUST
be usable in a browser without the author present, via a shareable hosted
link.

Visual language MUST stay consistent across maps, dates, and matches:

- Humans and bots are always distinguishable (color, stroke, or icon —
  never by legend text alone).
- Combat, loot, and storm events use distinct, stable markers; the same
  event type MUST look the same on every map.
- Filters for map, date, and match are always available in the same
  place and apply to paths, markers, playback, and heatmaps together.
- Timeline/playback MUST show a match unfolding over `ts`, with a
  visible playhead and the ability to pause.
- Heatmaps (kill zones, death zones, high-traffic areas) MUST be
  independently togglable and labeled so a designer knows which overlay
  is active.
- Loading, empty, partial-data, and error states MUST be explicit.
  Jargon-heavy controls, unlabeled dots, and filter state that silently
  desync from the canvas are defects.

Rationale: Product thinking is scored on whether a Level Designer would
actually use the tool. Consistency is how trust is earned.

### V. Interactive Performance Budget
The dataset is modest in rows (~89,000 events across 1,243 files, 796
matches, 339 players) but hostile in packaging: many small parquet
files, position samples as ~85%+ of rows, and minimap assets of
~3–12 MB each. The tool MUST stay interactive under those conditions.

Non-negotiable budgets:

- First meaningful map view MUST appear without parsing every file in
  `player_data/` on the critical path. Index or pre-aggregate by day,
  `map_id`, and `match_id`; load journey detail on demand.
- Filter and match changes MUST NOT freeze the UI. Heavy work
  (parquet parse, heatmap bins, path simplification) MUST run off the
  main thread or at build time.
- Playback MUST hold at least 30 fps on a typical laptop browser while
  drawing one match's humans, bots, and event markers.
- Heatmaps MUST be computed from aggregated bins, not by painting every
  `Position`/`BotPosition` sample as an independent DOM node.
- Minimap images MUST be served at web-appropriate size/compression;
  shipping the raw 9–12 MB assets as page backgrounds is a defect.
- Position-only samples MAY be downsampled for path display; discrete
  events (`Kill`, `Killed`, `BotKill`, `BotKilled`, `Loot`,
  `KilledByStorm`) MUST never be dropped.

Rationale: A hosted demo that hitchs, hangs, or times out fails
end-to-end execution — regardless of mapping correctness.

## Data & Runtime Constraints

The constitution binds to this dataset, not to a hypothetical warehouse.

| Constraint | Rule |
|------------|------|
| Source files | 1,243 parquet objects in `February_10`–`February_14`; no extension |
| Volume | ~89,000 event rows; Position/BotPosition dominate |
| Identity | UUID `user_id` = human; numeric `user_id` = bot |
| Maps | AmbroseValley, GrandRift, Lockdown only; unknown `map_id` is an error state |
| Projection | `u = (x - origin_x) / scale`; `v = (z - origin_z) / scale`; pixel `(u*1024, (1-v)*1024)` |
| Time | `ts` orders events inside a match; date filters use folder names |
| Partial day | `February_14` MUST be disclosed as incomplete |
| Assets | Minimaps live in `player_data/minimaps/`; optimize before serving |
| Hosting | The tool MUST be reachable at a public URL without local setup |
| Docs | `README` (stack, setup, env), `ARCHITECTURE.md` (flow, projection, assumptions, tradeoffs), `INSIGHTS.md` (three evidenced findings) are required deliverables |

Tech stack is not prescribed. Whatever is chosen MUST still honor the
quality, testing, UX, and performance principles above.

## Quality Gates

A change is not complete until all of the following hold:

1. Automated contract tests for projection, actor type, event decode,
   and filters pass.
2. Player paths render on the correct minimap for the active `map_id`.
3. Humans and bots are visually distinct; kill, death, loot, and storm
   markers are present and distinct.
4. Map, date, and match filters work and stay in sync with the canvas.
5. Timeline or playback shows match progression over `ts`.
6. Heatmaps for kill, death, and traffic are available and labeled.
7. Performance budgets in Principle V are met on a representative match
   (not only on a toy subset).
8. Assumptions and coordinate mapping are documented in
   `ARCHITECTURE.md`.
9. The hosted URL loads without the author's machine or undocumented
   steps.

Unknown, unreadable, or out-of-range inputs MUST surface as an explicit
error or empty state. Silent fallback (wrong map, guessed origin, dropped
day, coerced event type) is a defect.

Features that fail a gate MUST be fixed or removed from the shipped
surface. They MUST NOT remain as silent broken controls.

## Feature Contract

Every spec, plan item, and implementation task MUST declare a feature
contract before work starts. The card is the unit of discipline:

```
Implementing: Principle <N> + Quality Gate <K>
Contract: <invariant the code must preserve>
Test: <assertion that fails if the invariant breaks>
Failure behavior: explicit error/empty/partial state, never silent fallback
```

Example (projection):

```
Implementing: Principle II + Quality Gate 2
Contract: map_id → {scale, origin_x, origin_z}
Test: known world coordinate → expected pixel coordinate
Failure behavior: explicit error/empty state, never silent fallback
```

A task without this card MUST NOT be implemented. A task whose test is
only "looks right on the canvas" MUST NOT be treated as satisfying
Principle III.

## Pipeline & Build Order

The architectural boundary MUST remain:

`Parquet → Normalize → Index/Reconstruct → Project → Filter → Visualize`

UI layers MUST NOT understand raw Parquet records. That separation is
how Principles I, II, III, and V stay satisfiable.

Work MUST NOT start at the visualization UI. The required sequence is:

1. Repository/data inspection — verify schema across all five days;
   confirm event payload shapes and `ts` behavior; identify unreadable
   files.
2. Canonical data model — decode `event`; classify human/bot; preserve
   source day folder; define the canonical event representation.
3. Projection module — three map configs; one pure `worldToPixel()`;
   projection tests including the AmbroseValley example.
4. Match reconstruction — group by `match_id`; join across files; sort
   by `ts`; preserve discrete events; reconstruction tests.
5. Index/pre-aggregation — day → map → match; match metadata; event and
   player counts; optional heatmap bins.
6. Visualization — minimap, player paths, human/bot distinction, event
   markers, filters.
7. Playback — match timeline, play/pause, playhead, progressive
   path/event rendering.
8. Heatmaps — traffic, kill zones, death zones, independent toggles.
9. Performance pass — asset optimization, path downsampling, worker or
   build-time computation, 30 fps playback validation.
10. Hosted deployment and docs — public URL, `README`,
    `ARCHITECTURE.md`, `INSIGHTS.md`.
11. Final Quality Gate review.

Skipping ahead to canvas work before steps 1–5 have passing contract
tests is a governance violation.

## Governance

This constitution is the binding engineering contract for the LILA
Player Journey Visualization project. It supersedes informal preference,
tutorial defaults, and ad-hoc AI output. When a suggestion conflicts
with a principle, the principle wins.

Amendments:

- MUST be written into this file before the behavior they authorize ships.
- MUST bump `CONSTITUTION_VERSION` using SemVer: MAJOR for removed or
  incompatible principles; MINOR for new principles or materially expanded
  rules; PATCH for clarifications and wording fixes.
- MUST update `Last Amended` to the amendment date (`YYYY-MM-DD`) and
  record a Sync Impact Report comment at the top of this file.
- MUST NOT weaken Principles II–V (fidelity, tests, UX consistency,
  performance) without a recorded tradeoff in `ARCHITECTURE.md` and an
  explicit version bump.

Compliance:

- Specs, plans, and tasks MUST include a Feature Contract card and cite
  the principle and Quality Gate they implement.
- Reviews (human or agent) MUST check Quality Gates, not only visual
  appearance.
- Complexity beyond
  `Parquet → Normalize → Index/Reconstruct → Project → Filter → Visualize`
  MUST be justified against Principle I (quality over quantity).
- Implementation decisions MUST reference the relevant principle. Silent
  contract changes are amendments and require a version bump.

**Version**: 1.1.0 | **Ratified**: 2026-08-25 | **Last Amended**: 2026-08-25
