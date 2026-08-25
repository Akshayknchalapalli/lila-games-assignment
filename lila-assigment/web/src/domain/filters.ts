import type { DayId, FilterState, MatchIndex } from "./types";
import { DEFAULT_DAY, DEFAULT_MAP } from "./types";

export function defaultFilterState(): FilterState {
  return { mapId: DEFAULT_MAP, dayId: DEFAULT_DAY, matchId: null };
}

export function matchesForFilter(index: MatchIndex, filter: FilterState) {
  return index.matches.filter((row) => {
    if (filter.mapId && row.mapId !== filter.mapId) return false;
    if (filter.dayId && row.collectionDay !== filter.dayId) return false;
    return true;
  });
}

export function isPartialDay(index: MatchIndex, dayId: DayId | null): boolean {
  if (!dayId) return false;
  const row = index.days.find((d) => d.dayId === dayId);
  return row?.partialDay === true || dayId === "February_14";
}

export function applyFilterChange(
  current: FilterState,
  patch: Partial<FilterState>,
  index: MatchIndex,
): FilterState {
  const next: FilterState = { ...current, ...patch };
  if (patch.mapId !== undefined || patch.dayId !== undefined) {
    next.matchId = patch.matchId ?? null;
  }
  const list = matchesForFilter(index, next);
  if (next.matchId && !list.some((row) => row.matchId === next.matchId)) {
    next.matchId = null;
  }
  return next;
}

export function dayFilterKey(dayId: DayId): DayId {
  return dayId;
}
