import { describe, expect, it } from "vitest";
import { markerStyleFor, pathStyleFor } from "./visualLanguage";

describe("visual language (T033)", () => {
  it("gives humans and bots distinct stroke and color", () => {
    const human = pathStyleFor("human");
    const bot = pathStyleFor("bot");
    expect(human.stroke).not.toBe(bot.stroke);
    expect(human.lineWidth).not.toBe(bot.lineWidth);
    expect(human.dash.join(",")).not.toBe(bot.dash.join(","));
  });

  it("keeps six discrete markers distinct and does not mark movement", () => {
    expect(markerStyleFor("Position")).toBeNull();
    expect(markerStyleFor("BotPosition")).toBeNull();
    const kinds = ["Kill", "Killed", "BotKill", "BotKilled", "Loot", "KilledByStorm"] as const;
    const signatures = kinds.map((kind) => {
      const style = markerStyleFor(kind);
      expect(style).not.toBeNull();
      return `${style!.shape}:${style!.fill}`;
    });
    expect(new Set(signatures).size).toBe(6);
  });
});
