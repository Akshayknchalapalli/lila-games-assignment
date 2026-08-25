import type { FilterState, MatchIndex } from "../domain/types";
import { isPartialDay, matchesForFilter } from "../domain/filters";

type Props = {
  index: MatchIndex;
  filter: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
};

export function FilterBar({ index, filter, onChange }: Props) {
  const matches = matchesForFilter(index, filter);
  return (
    <section className="chrome-row" aria-label="Filters">
      <label>
        Map
        <select
          value={filter.mapId ?? ""}
          onChange={(e) =>
            onChange({ mapId: e.target.value as FilterState["mapId"], matchId: null })
          }
        >
          {index.maps.map((map) => (
            <option key={map.mapId} value={map.mapId}>
              {map.displayName ?? map.mapId}
            </option>
          ))}
        </select>
      </label>
      <label>
        Collection day
        <select
          value={filter.dayId ?? ""}
          onChange={(e) =>
            onChange({ dayId: e.target.value as FilterState["dayId"], matchId: null })
          }
        >
          {index.days.map((day) => (
            <option key={day.dayId} value={day.dayId}>
              {day.label ?? day.dayId}
            </option>
          ))}
        </select>
      </label>
      {isPartialDay(index, filter.dayId) ? (
        <span className="partial-pill">Partial day — incomplete sample</span>
      ) : null}
      <label className="match-select">
        Match
        <select
          value={filter.matchId ?? ""}
          onChange={(e) => onChange({ matchId: e.target.value || null })}
        >
          <option value="">Select a match…</option>
          {matches.map((match) => (
            <option key={match.matchId} value={match.matchId}>
              {match.matchId} · {match.humanCount}H/{match.botCount}B
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
