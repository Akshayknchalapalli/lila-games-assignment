import { describe, expect, it } from "vitest";
import type { CanonicalEvent } from "./types";
import {
  advancePlayhead,
  clampPlayhead,
  disabledPlayhead,
  playbackSpeedLabel,
  playheadForMatch,
  visibleEvents,
  wallClockToTsDelta,
} from "./playhead";

const events: CanonicalEvent[] = [
  {
    userId: "h",
    actorKind: "human",
    matchId: "m",
    mapId: "AmbroseValley",
    collectionDay: "February_10",
    x: 0,
    y: 0,
    z: 0,
    ts: 100,
    eventKind: "Position",
    sourceFile: "a",
  },
  {
    userId: "h",
    actorKind: "human",
    matchId: "m",
    mapId: "AmbroseValley",
    collectionDay: "February_10",
    x: 1,
    y: 0,
    z: 1,
    ts: 200,
    eventKind: "Kill",
    sourceFile: "a",
  },
];

describe("playhead contract (T044)", () => {
  it("keeps t in [tsMin, tsMax] and visible set is ts <= t", () => {
    const state = playheadForMatch("m", 100, 200);
    expect(state.t).toBe(200);
    expect(state.t).toBeGreaterThanOrEqual(state.tsMin!);
    expect(state.t).toBeLessThanOrEqual(state.tsMax!);
    expect(clampPlayhead(50, 100, 200)).toBe(100);
    expect(clampPlayhead(250, 100, 200)).toBe(200);
    expect(visibleEvents(events, 100).map((e) => e.eventKind)).toEqual(["Position"]);
    expect(visibleEvents(events, 200).map((e) => e.eventKind)).toEqual([
      "Position",
      "Kill",
    ]);
  });

  it("null match is disabled", () => {
    const idle = disabledPlayhead();
    expect(idle.matchId).toBeNull();
    expect(idle.playing).toBe(false);
    expect(advancePlayhead(idle, 16).playing).toBe(false);
  });

  it("scales advance by playback rate", () => {
    const playing = { matchId: "m", t: 100, playing: true, tsMin: 100, tsMax: 1000 };
    expect(advancePlayhead(playing, 100, 0.5).t).toBe(150);
    expect(advancePlayhead(playing, 100, 2).t).toBe(300);
  });

  it("maps one wall-clock second to one timestamp unit", () => {
    expect(wallClockToTsDelta(1000)).toBe(1);
    expect(wallClockToTsDelta(16.67)).toBeCloseTo(0.01667, 5);
  });

  it("labels 1x as Normal like YouTube", () => {
    expect(playbackSpeedLabel(1)).toBe("Normal");
    expect(playbackSpeedLabel(1.5)).toBe("1.5");
  });
});
