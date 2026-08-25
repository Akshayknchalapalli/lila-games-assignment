import { describe, expect, it } from "vitest";
import { measureAdvanceFps } from "./playback";

describe("playback performance (T057)", () => {
  it("advances a representative playhead faster than 30 FPS equivalent", () => {
    const fps = measureAdvanceFps(400);
    expect(fps).toBeGreaterThanOrEqual(30);
  });
});
