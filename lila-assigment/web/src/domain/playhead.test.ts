import { describe, expect, it } from "vitest";
import type { CanonicalEvent } from "./types";
import {
  advancePlayhead,
  clampPlayhead,
  disabledPlayhead,
  playheadForMatch,
  visibleEvents,
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
});
