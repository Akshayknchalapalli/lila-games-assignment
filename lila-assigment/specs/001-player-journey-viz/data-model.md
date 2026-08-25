# Data Model: Player Journey Visualization

Canonical types consumed by the web app. Raw Parquet columns are pipeline-only and MUST NOT appear in UI modules.

Source of truth for field names: `contracts/canonical-event.schema.json`, `contracts/match-index.schema.json`, `contracts/heatmap-bins.schema.json`.

**Boundary**: `valid raw row → Event`. `invalid/unknown/unreadable row → QuarantineRecord`. A canonical `Event` is never an unknown actor or unknown event kind.

## Entities

### MapConfig

Projection **parameters** (`scale`, `originX`, `originZ`, `imageWidth`, `imageHeight`) MUST equal the corresponding values in `contracts/map-config.json`. They are not independently configurable. This table documents that artifact; it is not a second source of truth.

| Field | Type | Rules |
|-------|------|--------|
| mapId | enum | `AmbroseValley` \| `GrandRift` \| `Lockdown` only |
| displayName | string | From MapConfig artifact |
| scale | number | MUST equal `contracts/map-config.json` for that `mapId` |
| originX | number | MUST equal `contracts/map-config.json` for that `mapId` |
| originZ | number | MUST equal `contracts/map-config.json` for that `mapId` |
| imageWidth | number | MUST equal `contracts/map-config.json` (`1024`) |
| imageHeight | number | MUST equal `contracts/map-config.json` (`1024`) |
| assetPath | string | Compressed minimap in the web public tree |

**Validation**: Unknown `mapId` on a **record** → quarantine that record; do not substitute another config. The match/view MUST NEVER use a stand-in map. If remaining valid records share one known `mapId`, the match still reconstructs. If they do not, the match view is empty/error.

**Projection** (see `contracts/projection.md`; formula implementations in Python and TypeScript MUST use these MapConfig parameters):

```
u = (x - originX) / scale
v = (z - originZ) / scale
pixelX = u * 1024
pixelY = (1 - v) * 1024
```

`y` (elevation) is stored on events and MUST NOT enter this formula.

---

### CollectionDay

| Field | Type | Rules |
|-------|------|--------|
| dayId | string | `February_10` … `February_14` |
| partialDay | boolean | `true` iff `February_14` |
| label | string | MUST disclose incompleteness when `partialDay` |

**Validation**: Date filters key off `dayId`, never off event `ts`.

---

### Actor

Canonical actor on a Journey. Unknown identities never become this entity.

| Field | Type | Rules |
|-------|------|--------|
| userId | string | As in Parquet `user_id` |
| actorKind | enum | `human` \| `bot` only |

**Validation** (at normalize, before Event exists):

- UUID `8-4-4-4-12` → `human` → Event/Journey
- Entirely digits → `bot` → Event/Journey
- Else → `QuarantineRecord` (`unknown_actor`); never coerce; never an Event

---

### Event (canonical)

One **valid** row after decode/normalize. Unreadable files never produce Events (they increment `filesSkipped`). Unknown actor, unknown event name, or unknown `mapId` never produce Events (they become `QuarantineRecord`).

| Field | Type | Rules |
|-------|------|--------|
| userId | string | |
| actorKind | enum | `human` \| `bot` only |
| matchId | string | Includes `.nakama-0` suffix when present |
| mapId | enum | Must resolve to MapConfig (`AmbroseValley` \| `GrandRift` \| `Lockdown`) |
| collectionDay | string | Folder name, not `ts` |
| x, y, z | number | World; plot uses x,z |
| ts | number | Match-relative timestamp preserved from source; used only to order and play a match. Physical unit is `Match.tsUnit`, not implied by this field alone. |
| eventKind | enum | The eight kinds below only |
| sourceFile | string | Provenance; not a visualization field |

**eventKind** (canonical visualization model — no `unknown`):

| Kind | Role | Path | Marker | Traffic bin | Kill bin | Death bin |
|------|------|------|--------|-------------|----------|-----------|
| Position | human movement | yes | no | yes | no | no |
| BotPosition | bot movement | yes | no | yes | no | no |
| Kill | human killed human | no | distinct | no | yes | no |
| Killed | human killed by human | no | distinct | no | no | yes |
| BotKill | human killed bot | no | distinct | no | yes | no |
| BotKilled | human killed by bot | no | distinct | no | no | yes |
| KilledByStorm | storm death | no | distinct | no | no | yes |
| Loot | item pickup | no | distinct | no | no | no |

Discrete kinds MUST NOT be dropped when paths are simplified.

---

### Journey

One canonical actor inside one match. Identity: `(userId, matchId)`. Contains only canonical Events.

| Field | Type | Rules |
|-------|------|--------|
| actor | Actor | `human` or `bot` |
| matchId | string | |
| events | Event[] | Sorted by `ts` ascending; no quarantine rows |

---

### Match

**Reconstruction invariant**: A Match is reconstructed from all **valid** journeys sharing the exact `matchId`; quarantined records are excluded and never participate. If remaining valid journeys have conflicting known `mapId` or `collectionDay`, the match is error/empty — never a stand-in map or guessed day. If no valid journeys remain, the match view is error/empty.

Join remaining journeys, then sort all remaining events by `ts`.

| Field | Type | Rules |
|-------|------|--------|
| matchId | string | |
| mapId | enum | Consensus of remaining valid journeys. Conflicting known maps → match view error. Unknown-map **records** are quarantined first (record-level); they do not by themselves discard the match. |
| collectionDay | string | Consensus of remaining valid journeys. Conflict → error/empty, not a silent pick |
| partialDay | boolean | From CollectionDay |
| humanCount | integer | Canonical humans only |
| botCount | integer | Canonical bots only |
| tsMin, tsMax | number | For playback domain |
| tsUnit | string | Physical unit recorded after schema inspection (`ms` for this export: Parquet `timestamp[ms]`). Not a calendar field. |
| journeys | Journey[] | Valid journeys only |
| events | Event[] | Flattened valid events, sorted by `ts` |

**State**: `unselected` → `loading` → `ready` \| `empty` \| `error`.

---

### FilterState

| Field | Type | Rules |
|-------|------|--------|
| mapId | MapConfig.mapId \| null | Default landing: `AmbroseValley` |
| dayId | CollectionDay.dayId \| null | Default landing: `February_10` |
| matchId | string \| null | Required for paths/playback |

**Validation**: Changing any field MUST reset derived canvas, playhead, and heatmap to the new subset or to empty — never leave the previous match.

---

### Playhead

| Field | Type | Rules |
|-------|------|--------|
| matchId | string \| null | null → controls disabled |
| t | number | `tsMin ≤ t ≤ tsMax` |
| playing | boolean | |

**Visible set**: canonical events with `ts <= t`. Pause freezes `t`.

---

### HeatmapGrid

| Field | Type | Rules |
|-------|------|--------|
| overlay | enum | `traffic` \| `kill` \| `death` |
| mapId | enum | |
| dayId | string \| null | Set for **map+day** grain; MUST be null for per-match grain |
| matchId | string \| null | Set for **per-match** grain; MUST be null for map+day grain |
| columns, rows | integer | 64 × 64 |
| counts | number[] | length `columns * rows`, row-major |
| maxCount | number | MUST equal `max(counts)`; `0` when all bins are 0 → empty overlay state |

**Grain**: exactly one of (1) `dayId` set and `matchId` null, or (2) `matchId` set and `dayId` null. Both null and both set are invalid. There is no map-wide third grain.

**Validation**: Render from `counts` as one bitmap. Forbidden: one DOM node per movement sample. Bins are counted from canonical Events only.

---

### LoadReport

Emitted in `index.json` (full LoadReport including `quarantinePath`) and as the summary on `diagnostics.json` (same counts and `skipReasons`, **without** `quarantinePath` — that path would be self-referential inside diagnostics.json).

| Field | Type | Rules |
|-------|------|--------|
| filesSeen | integer | |
| filesSkipped | integer | Unreadable Parquet **files** (no rows available) |
| skipReasons | { file, reason }[] | File-level failures |
| unknownActors | integer | Readable row; `userId` neither UUID nor numeric |
| unknownEvents | integer | Readable row; name not one of the eight after decode |
| unknownMaps | integer | Readable row; `mapId` not in MapConfig |
| quarantinePath | string | Path to `diagnostics.json`. Required on **index.json** `loadReport` only. MUST NOT appear inside `diagnostics.json`. |

**Two failure classes**:

```text
Unreadable file
    → no rows available
    → file skipped
    → filesSkipped++

Readable file + bad row
    → row quarantined (not an Event)
    → corresponding unknown*++
    → remaining valid rows continue as Events
```

### QuarantineRecord

One retained diagnostic row. This is the only home for unknown actor, unknown event name, unknown map, unreadable file, or `ts` unit mismatch. Those rows are **not** Events.

| Field | Type | Rules |
|-------|------|--------|
| reason | enum | `unreadable_file` \| `unknown_actor` \| `unknown_event` \| `unknown_map` \| `ts_unit_mismatch` |
| sourceFile | string | |
| userId, matchId, mapId, eventRaw | string? | Present when the row was parsed |

Quarantined rows MUST NOT feed paths, markers, heatmap bins, or Match reconstruction. Counts > 0 → UI partial-data state. Session MUST continue. Zero-count diagnostics file is still written so absence of the file cannot mean “nothing went wrong.”

## Relationships

```text
CollectionDay 1--* Match
MapConfig 1--* Match
Match 1--* Journey          (valid only)
Journey 1--1 Actor          (human|bot only)
Journey 1--* Event          (eight eventKind values only)
Match 1--* Event
QuarantineRecord            (parallel to Event; never in Match)
FilterState --> Match (optional)
Playhead --> Match
HeatmapGrid --> (MapConfig, CollectionDay and/or Match)
```

## Identity rules

- **Human vs bot**: `userId` shape only. Unknown shape → quarantine, not Actor.
- **Match reconstruction**: exact `matchId` among **valid** journeys only, including server suffix.
- **Calendar vs clock**: `collectionDay` vs `ts`.
