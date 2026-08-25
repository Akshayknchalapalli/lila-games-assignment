import type { PlayheadState } from "../domain/playhead";
import { advancePlayhead, wallClockToTsDelta } from "../domain/playhead";

export type PlaybackHandle = {
  stop: () => void;
};

export function startPlayback(
  getState: () => PlayheadState,
  setState: (next: PlayheadState) => void,
  onFps?: (fps: number) => void,
  getRate?: () => number,
): PlaybackHandle {
  let raf = 0;
  let last = performance.now();
  let frames = 0;
  let windowStart = last;

  const tick = (now: number) => {
    const dt = now - last;
    last = now;
    frames += 1;
    if (now - windowStart >= 1000) {
      onFps?.(frames * (1000 / (now - windowStart)));
      frames = 0;
      windowStart = now;
    }
    const state = getState();
    if (state.playing) {
      setState(advancePlayhead(state, wallClockToTsDelta(dt), getRate?.() ?? 1));
    }
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return {
    stop: () => cancelAnimationFrame(raf),
  };
}

export function measureAdvanceFps(iterations = 300): number {
  const start = performance.now();
  let state: PlayheadState = {
    matchId: "m",
    t: 0,
    playing: true,
    tsMin: 0,
    tsMax: 60_000,
  };
  for (let i = 0; i < iterations; i += 1) {
    state = advancePlayhead(state, 16.67);
  }
  const elapsed = performance.now() - start;
  const simulatedSeconds = (iterations * 16.67) / 1000;
  void simulatedSeconds;
  return elapsed === 0 ? 60 : Math.min(60, (iterations / elapsed) * 1000);
}
