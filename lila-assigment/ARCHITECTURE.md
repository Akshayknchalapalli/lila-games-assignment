# Architecture — Player Journey Visualization

Pipeline (non-negotiable):

`Parquet → Normalize → Index/Reconstruct → Project → Filter → Visualize`

The UI consumes canonical JSON only. It MUST NOT import Parquet readers.

## MapConfig single source of truth

`specs/001-player-journey-viz/contracts/map-config.json` is the only projection-parameter file. Python loads it in `pipeline/src/map_config.py`. The build copies those parameters into `index.json` `maps`. TypeScript `worldToPixel(mapConfig, x, z)` reads the embedded MapConfig, not a second origin/scale table.

Formula (`y` is elevation and is not used):

```
u = (x - originX) / scale
v = (z - originZ) / scale
pixelX = u * 1024
pixelY = (1 - v) * 1024
inBounds = (0 ≤ pixelX < 1024) ∧ (0 ≤ pixelY < 1024)
```

Origin fixtures project to `(0, 1024)` with `inBounds: false`. The formula does not clamp `pixelY` to 1023.

## Canonical boundary

```
raw row
  ├── valid → Event (human|bot, eight eventKind values, known mapId)
  └── invalid/unknown/unreadable → QuarantineRecord
```

Unknown actor/event/map rows never become Events, markers, heatmap bins, or reconstruction inputs.

## Time

- `collectionDay` = folder name (`February_10` … `February_14`). Filters key this field, never `ts`.
- `ts` is match-relative. Inspection recorded Parquet `timestamp[ms]`; the payload stores `tsUnit: "ms"`.
- February 14 is `partialDay: true`.

## Reconstruction

Join valid journeys by exact `matchId`, sort by `ts`. Conflicting remaining known `mapId`/`collectionDay` → the match is omitted from the index (empty/error, never a stand-in map). A single unknown-map row is quarantined and does not discard the rest of the match.

## Heatmaps

64×64 bins (`counts.length == 4096`) at map+day grain XOR per-match grain. Traffic ← Position+BotPosition; kill ← Kill+BotKill; death ← Killed+BotKilled+KilledByStorm. Loot and quarantine do not increment bins. The canvas rasterizes `ImageData`, not one DOM node per sample.

## Assets

Original minimaps are 3–12 MB. The pipeline writes ~64–73 KB WebP at 1024×1024 under `web/public/minimaps/`.

## Inspection notes (Phase 0)

- Extensionless files are valid Parquet (`user_id, match_id, map_id, x, y, z, ts, event`).
- `event` is binary; decode UTF-8.
- Unreadable files increment `filesSkipped` and do not abort.
- This export: 1243 files seen, 0 skipped, 0 quarantine rows, 795 reconstructed matches (README advertised 796 unique match ids; one match did not emit a ready MatchDetail — conflict or empty after validation, not a silent map stand-in).

## Tradeoffs

Two projection implementations (Python + TypeScript) share one parameter file and the same `testVectors`. Pre-projecting every event pixel in Python would hide Gate 2 from the UI. Canvas 2D rather than WebGL keeps the draw path inspectable at this scale (~89k events).
