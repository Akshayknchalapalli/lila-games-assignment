import type { CanonicalEvent } from "./types";

export type PlayheadState = {
  matchId: string | null;
  t: number | null;
  playing: boolean;
  tsMin: number | null;
  tsMax: number | null;
};

export function disabledPlayhead(): PlayheadState {
  return { matchId: null, t: null, playing: false, tsMin: null, tsMax: null };
}

export function playheadForMatch(
  matchId: string,
  tsMin: number,
  tsMax: number,
): PlayheadState {
  return { matchId, t: tsMin, playing: false, tsMin, tsMax };
}

export function clampPlayhead(t: number, tsMin: number, tsMax: number): number {
  return Math.min(tsMax, Math.max(tsMin, t));
}

export function visibleEvents(events: CanonicalEvent[], t: number): CanonicalEvent[] {
  return events.filter((event) => event.ts <= t);
}

export function advancePlayhead(state: PlayheadState, dtMs: number): PlayheadState {
  if (!state.matchId || state.t == null || state.tsMin == null || state.tsMax == null) {
    return { ...state, playing: false };
  }
  if (!state.playing) return state;
  const next = clampPlayhead(state.t + dtMs, state.tsMin, state.tsMax);
  return {
    ...state,
    t: next,
    playing: next < state.tsMax,
  };
}
