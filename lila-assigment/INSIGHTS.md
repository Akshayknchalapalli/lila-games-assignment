# Insights — Player Journey Visualization

Three findings from the generated canonical index (`web/public/data/index.json` after `python -m pipeline.build` on the five-day export). Counts are reconstructed **valid** matches only.

## 1. Ambrose Valley dominates rotation; Grand Rift is rare

| Map | Matches | Share |
|-----|---------|-------|
| AmbroseValley | 565 | 71% |
| Lockdown | 171 | 22% |
| GrandRift | 59 | 7% |

**What caught my eye:** Almost three quarters of this week’s production matches are on one map.

**Evidence:** 565 / 795 reconstructed matches are Ambrose Valley; Grand Rift has 59.

**Why a Level Designer should care:** “Typical traffic” drawn from this export is Ambrose traffic. Grand Rift conclusions from 59 matches will overfit.

**Actionable?** Yes.

| Metric to watch | Action |
|-----------------|--------|
| Matches per map per week | Do not retune Grand Rift loot/cover from this slice alone; wait for more volume or pull a dedicated Grand Rift export |
| Heatmap maxCount on Grand Rift vs Ambrose (same overlay) | Treat empty/quiet Grand Rift cells as possible under-sampling, not proof the space is unused |
| Queue / playlist weight (if LD owns it) | If Grand Rift is meant to be a real third map, raise its play share; if it is niche, document that so later telemetry weeks are not compared 1:1 with Ambrose |

## 2. Collection volume falls through the week; February 14 is not a full day

| Day | Matches |
|-----|---------|
| February_10 | 284 |
| February_11 | 200 |
| February_12 | 162 |
| February_13 | 112 |
| February_14 | 37 |

**What caught my eye:** Match count drops every day, then collapses on the 14th.

**Evidence:** 284 → 37 matches. February 14 is `partialDay: true` in the index. Date filters use the folder id, not event `ts` (those values look like `1970-01-21` because they are match-relative timestamps, not calendar dates).

**Why a Level Designer should care:** A day-level traffic heatmap on the 14th will look empty even if the map is fine. Comparing Wednesday to Sunday without the partial-day flag would look like a population crash.

**Actionable?** Yes.

| Metric to watch | Action |
|-----------------|--------|
| Matches / player-hours per collection day | Normalize day heatmaps by match count before saying “the map died mid-week” |
| Partial-day flag in any dashboard | Keep February 14 labeled incomplete; exclude it from 24-hour occupancy KPIs |
| Storm-death rate by day | Do not use Feb 14 as a baseline for storm-timing changes |

## 3. Lobbies are mixed human/bot; a few sessions are dense

**What caught my eye:** Almost every match is a mixed lobby, and load is not uniform.

**Evidence:** Across 795 matches the index records **780** distinct-human slots and **455** distinct-bot slots (sum of per-match distinct counts, not unique-across-dataset identities). Default landing (Ambrose Valley + February 10) has **199** selectable matches. The densest reconstructed match is `d0a38c30-d476-4305-857d-ece9e65f72e6.nakama-0` with **1216** canonical events. Quarantine on this export was empty (`filesSkipped = 0`); skip/count is still wired for a future corrupt file.

**Why a Level Designer should care:** Orange bot paths can dominate a screenshot. Tuning a compound from “busy” traffic without splitting human vs bot will tune for AI, not players. Playback/heatmap performance must be judged on the 1216-event match, not a 40-event one.

**Actionable?** Yes.

| Metric to watch | Action |
|-----------------|--------|
| Human-path vs bot-path occupancy (traffic overlay is mixed today) | When a POI is hot only on orange dashes, do not add player cover there; check bot spawn/patrol instead |
| Human share of Kill vs BotKill in a POI | If humans rarely fight there, loot/extract design is not being tested by this week’s humans |
| Events per match (p95 / max) | Keep playback on Canvas bins; re-test FPS on the 1216-event match after any draw change |
