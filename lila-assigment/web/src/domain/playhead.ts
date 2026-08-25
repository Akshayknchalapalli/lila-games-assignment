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
  return { matchId, t: tsMax, playing: false, tsMin, tsMax };
}

export function clampPlayhead(t: number, tsMin: number, tsMax: number): number {
  return Math.min(tsMax, Math.max(tsMin, t));
}

export function visibleEvents(events: CanonicalEvent[], t: number): CanonicalEvent[] {
  return events.filter((event) => event.ts <= t);
}

export function advancePlayhead(
  state: PlayheadState,
  dtTs: number,
  rate = 1,
): PlayheadState {
  if (!state.matchId || state.t == null || state.tsMin == null || state.tsMax == null) {
    return { ...state, playing: false };
  }
  if (!state.playing) return state;
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
  const next = clampPlayhead(state.t + dtTs * safeRate, state.tsMin, state.tsMax);
  return {
    ...state,
    t: next,
    playing: next < state.tsMax,
  };
}

/**
 * Canonical `ts` values are seconds (parquet timestamp[ms] holds unix-second
 * integers). Wall-clock `dt` from rAF is milliseconds.
 */
export function wallClockToTsDelta(dtMs: number): number {
  return dtMs / 1000;
}

export const PLAYBACK_RATES = [
  0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 4, 8, 16, 32, 64, 128, 256,
] as const;

export const DEFAULT_PLAYBACK_RATE = 64;

export function playbackSpeedLabel(rate: number): string {
  return rate === 1 ? "Normal" : String(rate);
}
