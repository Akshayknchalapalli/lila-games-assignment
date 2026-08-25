import { describe, expect, it } from "vitest";
import type { HeatmapGrid } from "../domain/types";
import { measureHeatmapRasterMs, rasterizeHeatmap } from "./heatmapLayer";

function grid(maxCount = 4): HeatmapGrid {
  const counts = Array.from({ length: 4096 }, (_, i) => (i === 10 ? maxCount : 0));
  return {
    overlay: "traffic",
    mapId: "AmbroseValley",
    dayId: "February_10",
    matchId: null,
    columns: 64,
    rows: 64,
    counts,
    maxCount,
  };
}

describe("heatmap layer (T049/T058)", () => {
  it("draws from counts length 4096 only", () => {
    const imageData = {
      width: 64,
      height: 64,
      data: new Uint8ClampedArray(64 * 64 * 4),
    };
    const result = rasterizeHeatmap(grid(), imageData);
    expect(result.data.length).toBe(64 * 64 * 4);
    expect(() =>
      rasterizeHeatmap(
        { ...grid(), counts: [1, 2, 3] },
        { width: 64, height: 64, data: new Uint8ClampedArray(64 * 64 * 4) },
      ),
    ).toThrow(/4096/);
  });

  it("rasterizes production-sized 64×64 bins quickly", () => {
    const ms = measureHeatmapRasterMs(grid(12), 15);
    expect(ms).toBeLessThan(16);
  });
});
