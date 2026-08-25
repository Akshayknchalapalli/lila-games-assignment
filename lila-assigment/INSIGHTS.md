# Insights — Player Journey Visualization

Three findings from the generated canonical index (`web/public/data/index.json` after `python -m pipeline.build` on the five-day export). Counts are reconstructed **valid** matches only.

## 1. Ambrose Valley dominates rotation; Grand Rift is rare

| Map | Matches | Share |
|-----|---------|-------|
| AmbroseValley | 565 | 71% |
| Lockdown | 171 | 22% |
| GrandRift | 59 | 7% |

A Level Designer reviewing “typical traffic” on Grand Rift from this week of data is looking at a thin sample. Filter empty-states are expected there, especially on later days.

## 2. Collection volume falls through the week; February 14 is not a full day

| Day | Matches |
|-----|---------|
| February_10 | 284 |
| February_11 | 200 |
| February_12 | 162 |
| February_13 | 112 |
| February_14 | 37 |

February 14 is labeled partial in the UI. Treating it as a complete 24-hour slice would overstate how empty the maps look that calendar day. Date filters use the folder id, not event `ts` (those timestamps look like `1970-01-21` because they are match-relative `timestamp[ms]`).

## 3. Matches are mixed human/bot, and a few sessions are dense

Across 795 matches the index records **780** distinct-human slots and **455** distinct-bot slots (sum of per-match distinct counts, not unique-across-dataset identities). Default landing (Ambrose Valley + February 10) has **199** selectable matches. The densest reconstructed match is `d0a38c30-d476-4305-857d-ece9e65f72e6.nakama-0` with **1216** canonical events — that is the representative playback/heatmap load, not a toy fixture.

Quarantine on this export was empty (`filesSkipped = 0`, `unknown* = 0`). Partial-data UI is still wired: a future corrupt file increments diagnostics instead of crashing the session.
