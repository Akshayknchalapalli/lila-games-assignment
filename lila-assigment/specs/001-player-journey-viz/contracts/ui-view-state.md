# UI view-state and visual language

The web app speaks only canonical JSON (`MatchIndex`, `MatchDetail`, `HeatmapGrid`). It MUST NOT import Parquet readers.

## Filter chrome (Story 3)

Stable controls, same location on every screen:

1. Map (`AmbroseValley` | `GrandRift` | `Lockdown`)
2. Collection day (`February_10` … `February_14`) — February 14 labeled partial
3. Match (from index rows matching map+day)

Changing any control updates paths, markers, playhead, and heatmaps together. Empty subset → empty state, not the previous canvas.

Default: Ambrose Valley + February 10 + match unselected (match list visible).

## Visual language (Stories 1–2)

| Signal | Rule |
|--------|------|
| Human path / actor | Distinct color **and** stroke or icon; not legend-only |
| Bot path / actor | Different color **and** stroke or icon |
| Kill | Unique marker |
| Killed | Unique marker |
| BotKill | Unique marker |
| BotKilled | Unique marker |
| Loot | Unique marker |
| KilledByStorm | Unique marker |
| unknown event/actor | Not drawn as markers. Counts live in `loadReport` / quarantine; UI shows partial-data |

Same `eventKind` looks the same on all three maps.

## Playback chrome (Story 4)

Play, pause, visible playhead. Domain is `tsMin`–`tsMax`. Disabled when no match. Visible geometry = `ts <= playhead`.

## Heatmap chrome (Story 5)

Three independent labeled toggles: Traffic, Kill zones, Death zones. Draw from `HeatmapGrid` as a single bitmap per overlay. `maxCount === 0` → empty overlay state.

## Hosted use (Story 6)

Loading, empty, partial (any non-zero `loadReport.filesSkipped`, `unknownActors`, `unknownEvents`, or `unknownMaps`), and error states are labeled. No author-required steps.

## Performance (Story 7)

First paint uses `MatchIndex` + compressed minimap only. Match detail fetched on selection. Playback ≥ 30 FPS on a representative match. Missed budget ⇒ feature incomplete.
