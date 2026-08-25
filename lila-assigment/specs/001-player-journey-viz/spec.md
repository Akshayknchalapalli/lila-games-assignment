# Feature Specification: Player Journey Visualization

**Feature Branch**: `001-player-journey-viz`

**Created**: 2026-08-25

**Status**: Draft

**Input**: User description: "Build and deploy a web-based Player Journey Visualization tool so LILA Games Level Designers can explore how players actually navigate LILA BLACK maps — movement, fights, storm deaths, loot, and ignored areas — from five days of production match telemetry, without the author present."

**Constitution**: v1.1.0 (binding engineering contract)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See journeys on the correct map (Priority: P1)

A Level Designer opens the tool, chooses a match, and sees every participant's path drawn on the correct top-down map image. Positions from the game world land in the right place on that image. Elevation is not treated as a map axis. The designer can immediately tell whether people actually used a ridge, a compound, or an empty quadrant.

**Why this priority**: Without correct placement on the right map, every later overlay is misleading. This is the core job of the tool.

**Independent Test**: Open one known match on Ambrose Valley, Grand Rift, and Lockdown. Confirm the matching map image is shown and a documented world position appears at the documented image location.

**Acceptance Scenarios**:

1. **Given** a match played on Ambrose Valley, **When** the designer opens that match, **Then** the Ambrose Valley map image is shown and paths sit on that image — not on Grand Rift or Lockdown.
2. **Given** a known world position from the data guide, **When** it is plotted, **Then** it appears at the documented image location (approximately pixel 78, 890 on Ambrose Valley for world -301.45, -355.55).
3. **Given** a match with several humans and bots, **When** the designer views it, **Then** each participant's movement path is visible on the same map.
4. **Given** an unknown or unsupported map name, **When** the designer would otherwise view it, **Then** they see an explicit error or empty state — never a different map used as a stand-in.

---

### User Story 2 - Tell humans, bots, and event types apart (Priority: P1)

While looking at a match, the designer can tell human players from bots at a glance (color, stroke, or icon — not legend text alone). Kills, deaths, loot pickups, and storm deaths use distinct, stable markers. The same event type looks the same on every map.

**Why this priority**: Level Designers need to see where fights happen, where people die to the storm, and where loot is taken. Mixing humans with bots or collapsing event types hides the signal.

**Independent Test**: Open a match known to contain humans, bots, combat, loot, and a storm death. Confirm each class is visually distinct without reading a caption.

**Acceptance Scenarios**:

1. **Given** a match with humans and bots, **When** the designer views paths and markers, **Then** humans and bots remain distinguishable without relying on legend text alone.
2. **Given** kill, death, loot, and storm-death events in the match, **When** the designer inspects the map, **Then** each of those event types uses a distinct marker.
3. **Given** the same event type on two different maps, **When** the designer switches maps, **Then** the marker appearance is unchanged.
4. **Given** movement samples versus discrete events, **When** the designer views the match, **Then** movement may be simplified for readability, but kill, death, loot, and storm-death markers are never omitted.

---

### User Story 3 - Filter by map, date, and match (Priority: P1)

The designer narrows the view using map, calendar date, and match. Those controls stay in the same place. Changing a filter updates paths, markers, playback, and heatmaps together. Dates come from the collection day (February 10–14), not from in-match clocks. February 14 is labeled as a partial day.

**Why this priority**: 796 matches across three maps is unusable as one pile. Filtering is how a designer asks a specific question.

**Independent Test**: Pick map + date + match and confirm the canvas shows only that subset. Switch each control and confirm the other layers follow.

**Acceptance Scenarios**:

1. **Given** the full dataset, **When** the designer selects a map, **Then** only matches and visuals for that map remain.
2. **Given** a selected map, **When** the designer selects a date, **Then** only matches collected that calendar day remain, and the in-match clock is not used as the calendar date.
3. **Given** map and date selected, **When** the designer selects a match, **Then** paths, markers, playback, and heatmaps all reflect that match only.
4. **Given** February 14 is selected or summarized, **When** the designer views that day, **Then** the UI states that the day is incomplete.
5. **Given** a filter combination with no matches, **When** the designer applies it, **Then** they see an empty state, not a stale previous match.

---

### User Story 4 - Watch a match unfold (Priority: P2)

The designer plays a match along its in-match timeline: play, pause, and a visible playhead. Paths and events appear progressively as time advances. Time is match-relative (events ordered inside the match), not wall-clock.

**Why this priority**: Static paths show where people went; playback shows order — who rotated first, when the storm bite happened, when a fight broke out.

**Independent Test**: Play a representative match, pause mid-way, and confirm only events up to the playhead are shown; resume and confirm the rest appear in time order.

**Acceptance Scenarios**:

1. **Given** a reconstructed match, **When** the designer presses play, **Then** the match unfolds in in-match time order with a visible playhead.
2. **Given** playback running, **When** the designer pauses, **Then** the map stays at that moment and no later events are shown.
3. **Given** a match with multiple participants, **When** playback runs, **Then** the map remains usable (no freeze) on a typical laptop.
4. **Given** no match selected, **When** the designer looks at playback controls, **Then** they see an explicit empty or disabled state, not a broken timeline.

---

### User Story 5 - Inspect kill, death, and traffic heatmaps (Priority: P2)

The designer toggles three labeled overlays independently: high-traffic areas, kill zones, and death zones. Overlays follow the current filters. They help answer “which areas are ignored?” and “where do fights actually happen?”

**Why this priority**: Paths show individuals; heatmaps show patterns a Level Designer can act on.

**Independent Test**: Enable each overlay alone, then in combination, on a filtered map/date. Confirm labels match the active overlays and that unused areas stay visually quiet.

**Acceptance Scenarios**:

1. **Given** a filtered set of matches or a single match, **When** the designer enables the traffic overlay, **Then** high-movement areas are emphasized and the overlay is labeled as traffic.
2. **Given** the same view, **When** the designer enables kill and death overlays separately, **Then** each is labeled and can be turned off without hiding the others.
3. **Given** filters change, **When** an overlay is on, **Then** the heatmap reflects the new filter set — it does not keep the previous subset.
4. **Given** no events of a heatmap type in the filter, **When** that overlay is enabled, **Then** the designer sees an empty overlay state, not a leftover heatmap from another filter.

---

### User Story 6 - Use the tool without the author (Priority: P1)

A reviewer or Level Designer opens a public link and uses the tool in a browser. No local setup, no undocumented steps, no author on a call. Loading, empty, partial-data, and error states are explicit.

**Why this priority**: The assignment is failed if the tool cannot be opened and used independently. End-to-end execution is scored.

**Independent Test**: Open the public URL on a machine that does not contain the project. Complete map view, filter, playback, and heatmap flows.

**Acceptance Scenarios**:

1. **Given** only the public link, **When** a reviewer opens it, **Then** the tool loads in the browser and the major features are reachable.
2. **Given** telemetry that cannot be read, **When** the tool starts or a match is requested, **Then** unreadable records are skipped and counted; the session does not crash.
3. **Given** a slow or empty result, **When** the designer waits, **Then** they see a loading or empty state rather than a blank unlabeled canvas.

---

### Edge Cases

- Unreadable or corrupt match files are skipped and counted; they must not crash the tool.
- Unknown map names produce an explicit error/empty state; never silently use another map's image or mapping.
- February 14 is always disclosed as a partial day in any day-level summary or filter label.
- A match is the union of every participant file that shares that match identity, ordered by in-match time.
- In-match timestamps look like calendar dates near 1970; they must never be used as collection dates.
- Filter combinations with zero matches show an empty state; they must not keep the previous canvas.
- Positions outside a map image's expected range are visible as an explicit out-of-range condition, not clipped without notice if they would land off the image.
- Human vs bot is determined from player identity shape (UUID vs short numeric id), not from guesswork if a filename is odd.
- Discrete combat/loot/storm events are never dropped when movement samples are simplified for display.
- Switching map, date, or match never leaves playback, markers, and heatmaps on a previous selection.

## Requirements *(mandatory)*

### Feature Contracts

Every story and the performance contract below is bound to constitution v1.1.0. Implementation tasks MUST copy a card in this form. A visualization task without the Performance contract MUST NOT be treated as complete.

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

**Story 4 — playback**

```
Implementing: Principle IV + Quality Gate 5
Contract: playhead position = in-match time; visible events and paths are those with time ≤ playhead
Test: pause mid-match hides later events; play resumes in time order
Failure behavior: no match selected → disabled/empty timeline, never a broken control
```

**Story 5 — heatmaps**

```
Implementing: Principle IV + Principle V + Quality Gate 6
Contract: traffic / kill / death overlays are independent, labeled, and scoped to the active filter set; heatmaps operate on aggregated spatial bins; raw movement samples are never rendered as individual heatmap DOM nodes
Test: toggling one overlay does not hide the others; filter change replaces the overlay data; heatmap drawing uses bins, not one node per Position/BotPosition sample
Failure behavior: no samples for an overlay → empty overlay state, never a leftover heatmap
```

**Story 6 — independent use**

```
Implementing: Principle II + Principle IV + Quality Gate 9
Contract: a public link is sufficient to use the tool (Quality Gate 9); unreadable files are skipped and counted (Principle II)
Test: open the link on a clean machine and complete the core flows; corrupt files do not abort the session
Failure behavior: load/error/partial states are explicit; the tool does not crash on bad files
```

**Performance / runtime**

```
Implementing: Principle V + Quality Gates 7 and 9
Contract: first meaningful map view does not require loading the full five-day archive; filtering remains responsive; playback targets ≥30 FPS on a representative match; heatmaps use aggregated bins; discrete events are preserved
Test: measure initial-load work, filter interaction, representative-match playback frame rate, and heatmap rendering on the production-sized dataset
Failure behavior: if a performance budget is missed, the feature is not considered complete; optimize, reduce/simplify the implementation, or remove the offending surface
```

### Functional Requirements

- **FR-001**: The system MUST present LILA BLACK match telemetry on the three maps in rotation: Ambrose Valley, Grand Rift, and Lockdown.
- **FR-002**: The system MUST place each event on the map image using world horizontal position `(x, z)` and the per-map scale and origin from the data guide. Vertical `y` MUST be treated as elevation only.
- **FR-003**: The system MUST use the matching map image for the match's map identity. Image mapping MUST flip the vertical image axis so the top of the image corresponds to the high end of the map's v coordinate.
- **FR-004**: The system MUST classify participants as human when identity is a UUID and as bot when identity is a short numeric id, and MUST keep that distinction visible on the map.
- **FR-005**: The system MUST decode event names before display and MUST support: Position, BotPosition, Kill, Killed, BotKill, BotKilled, KilledByStorm, and Loot.
- **FR-006**: The system MUST show Kill, Killed, BotKill, BotKilled, Loot, and KilledByStorm as distinct markers. Position and BotPosition are movement samples used for paths (and traffic), not as the same markers as combat/loot/storm.
- **FR-007**: Users MUST be able to filter the view by map, collection date, and match. Those three controls MUST remain in a stable location and MUST apply together to paths, markers, playback, and heatmaps.
- **FR-008**: Collection date MUST come from the day the files were grouped (February 10–14, 2026). In-match timestamps MUST only order events inside a match.
- **FR-009**: The system MUST reconstruct a match by combining every participant journey that shares the match identity and sorting by in-match time.
- **FR-010**: Users MUST be able to play and pause a match timeline with a visible playhead. While playing, paths and discrete events MUST appear in time order up to the playhead.
- **FR-011**: Users MUST be able to toggle traffic, kill-zone, and death-zone overlays independently. Each active overlay MUST be labeled.
- **FR-012**: The system MUST label February 14 as a partial day wherever that day is selected or summarized.
- **FR-013**: The system MUST skip unreadable source files, keep a count, and continue. It MUST NOT crash the session.
- **FR-014**: The system MUST show explicit loading, empty, partial-data, and error states. Silent fallback (wrong map, guessed origin, dropped day, coerced event type, stale filter) is forbidden.
- **FR-015**: The first meaningful map view MUST appear without making the designer wait for every match in the five-day archive to load. Detail for a specific match MAY appear after that match is selected.
- **FR-016**: Movement samples MAY be simplified for path drawing. Discrete Kill, Killed, BotKill, BotKilled, Loot, and KilledByStorm events MUST still all be shown.
- **FR-017**: The tool MUST be reachable at a public URL and usable in a browser without local project setup.
- **FR-018**: Map images MUST NOT make the page sluggish to open. Heavy original artwork MUST be reduced before designers see it.
- **FR-019**: Unknown map identity MUST be an error or empty state, never another map's image or mapping.
- **FR-020**: When filters yield no matches, the system MUST show an empty state and MUST NOT keep the previous match on the canvas.

### Key Entities

- **Map**: One of Ambrose Valley, Grand Rift, or Lockdown. Has a top-down image, a scale, and an origin used to place world positions on that image.
- **Collection Day**: A calendar day folder of telemetry (February 10–14). February 14 is partial. This is the only date used for date filters.
- **Match**: One game session, identified by match identity. Contains many participant journeys. Timeline is in-match time, not wall-clock.
- **Actor**: A human or a bot in a match. Humans have UUID identities; bots have short numeric identities. One actor may appear in many matches.
- **Journey**: One actor's recording inside one match: movement samples plus discrete events.
- **Event**: A timestamped occurrence with a type, world position, actor, match, map, and collection day. Movement types are Position (human) and BotPosition (bot). Discrete types are Kill, Killed, BotKill, BotKilled, KilledByStorm, and Loot.
- **Playhead**: The current in-match time during playback. Only events at or before this time are shown.
- **Heatmap Overlay**: An aggregated view of traffic, kills, or deaths for the active filter set. Independent of the other overlays.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer who has only the public link can open the tool and see a correctly mapped match on the right map image in under 60 seconds, with no install and no author help.
- **SC-002**: On a first pass through one match, a Level Designer can point to humans vs bots and to kill, death, loot, and storm-death markers without reading documentation.
- **SC-003**: After choosing a map, a date, and a match, 100% of visible paths, markers, playback, and heatmaps belong to that selection — verified by sampling identities on the canvas against the filter.
- **SC-004**: A designer can play a typical match, pause in the middle, and confirm that later events are hidden, then resume without the map freezing or becoming unusable.
- **SC-005**: Traffic, kill, and death overlays can each be turned on and off independently; an evaluator can complete that check in under 30 seconds.
- **SC-006**: Any view that includes February 14 states that the day is incomplete. Day-level conclusions must not treat it as a full day.
- **SC-007**: First map view appears without forcing the designer to wait through a load of the entire five-day archive on the critical path.
- **SC-008**: An evaluator can walk through map placement, human/bot distinction, event markers, filters, playback, and heatmaps in one sitting using only the hosted tool.

## Assumptions

- The primary user is a LILA Games Level Designer (and assignment reviewers acting as that user), not a data scientist. Controls stay in designer language (map, day, match, playback, heatmap) rather than schema jargon.
- The dataset is the provided five-day LILA BLACK export: about 1,243 journey files, about 89,000 events, 339 actors, 796 matches, three maps. No live match ingestion is in scope.
- Default landing: Ambrose Valley (primary map) and a complete collection day (February 10) with a match list. Playback and per-match paths require a match selection. Heatmaps may run on the current filter set (map+date or a single match).
- One match view shows all humans and bots in that match together. Side-by-side comparison of two matches is out of scope.
- No login, accounts, or permissions. The hosted link is enough.
- Desktop browser is the target. A polished phone layout is out of scope.
- Submission extras required by the assignment (`README`, architecture write-up, three evidenced insights) are project deliverables, not in-tool screens. They MUST still be produced before the work is called done (constitution Quality Gates 8 and 9).
- Quality over quantity: the six stories above are the shipped surface. Extra analytics (leaderboards, storm-radius reconstruction, per-weapon stats) are out of scope unless they fit without weakening these stories.
- Work follows constitution pipeline order: inspect data → canonical events → projection → match reconstruction → index → visualization → playback → heatmaps → performance pass → hosting and docs. Canvas work MUST NOT start before the data contract for placement, actors, events, and reconstruction is testable.
- Ambiguous telemetry is resolved with an explicit assumption in the architecture write-up; the UI never guesses silently.
