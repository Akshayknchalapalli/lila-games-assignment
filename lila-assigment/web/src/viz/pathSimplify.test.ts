import { describe, expect, it } from "vitest";
import type { CanonicalEvent } from "../domain/types";
import { simplifyMovement } from "./pathSimplify";

const base = {
  userId: "h",
  actorKind: "human" as const,
  matchId: "m",
  mapId: "AmbroseValley" as const,
  collectionDay: "February_10" as const,
  y: 0,
  sourceFile: "f",
};

function ev(partial: Partial<CanonicalEvent> & Pick<CanonicalEvent, "eventKind" | "ts" | "x" | "z">): CanonicalEvent {
  return { ...base, ...partial };
}

describe("path simplification (T056)", () => {
  it("may drop movement samples but never discrete events", () => {
    const events: CanonicalEvent[] = [
      ev({ eventKind: "Position", ts: 1, x: -301, z: -355 }),
      ev({ eventKind: "Position", ts: 2, x: -300.9, z: -354.9 }),
      ev({ eventKind: "Position", ts: 3, x: -300.8, z: -354.8 }),
      ev({ eventKind: "Kill", ts: 4, x: -280, z: -340 }),
      ev({ eventKind: "Loot", ts: 5, x: -270, z: -330 }),
    ];
    const mapConfig = {
      mapId: "AmbroseValley",
      scale: 900,
      originX: -370,
      originZ: -473,
      imageWidth: 1024,
      imageHeight: 1024,
    };
    const out = simplifyMovement(events, mapConfig, 4);
    expect(out.some((e) => e.eventKind === "Kill")).toBe(true);
    expect(out.some((e) => e.eventKind === "Loot")).toBe(true);
    expect(out.filter((e) => e.eventKind === "Position").length).toBeGreaterThan(0);
  });
});
