import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { worldToPixel, resolveMapConfig } from "./worldToPixel";

const contractPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../specs/001-player-journey-viz/contracts/map-config.json",
);

const mapConfigFile = JSON.parse(readFileSync(contractPath, "utf8")) as {
  imageWidth: number;
  imageHeight: number;
  maps: Array<{
    mapId: string;
    scale: number;
    originX: number;
    originZ: number;
  }>;
  testVectors: Array<{
    mapId: string;
    x: number;
    z: number;
    pixelX: number;
    pixelY: number;
    inBounds: boolean;
  }>;
};

function configFor(mapId: string) {
  const row = mapConfigFile.maps.find((m) => m.mapId === mapId);
  if (!row) throw new Error(`missing map ${mapId}`);
  return {
    ...row,
    imageWidth: mapConfigFile.imageWidth,
    imageHeight: mapConfigFile.imageHeight,
  };
}

describe("worldToPixel testVectors from canonical map-config.json", () => {
  it("projects every shared vector within ±1 px and preserves inBounds (no clamp)", () => {
    for (const vector of mapConfigFile.testVectors) {
      const result = worldToPixel(configFor(vector.mapId), vector.x, vector.z);
      expect(Math.abs(result.pixelX - vector.pixelX)).toBeLessThanOrEqual(1);
      expect(Math.abs(result.pixelY - vector.pixelY)).toBeLessThanOrEqual(1);
      expect(result.inBounds).toBe(vector.inBounds);
      if (vector.pixelX === 0 && vector.pixelY === 1024) {
        expect(result.inBounds).toBe(false);
        expect(result.pixelY).not.toBe(1023);
      }
    }
  });

  it("Ambrose interior fixture lands near (78, 890) with inBounds true", () => {
    const interior = mapConfigFile.testVectors.find((v) => v.inBounds);
    expect(interior?.mapId).toBe("AmbroseValley");
    const result = worldToPixel(configFor("AmbroseValley"), interior!.x, interior!.z);
    expect(result.inBounds).toBe(true);
    expect(Math.abs(result.pixelX - 78)).toBeLessThanOrEqual(1);
    expect(Math.abs(result.pixelY - 890)).toBeLessThanOrEqual(1);
  });

  it("unknown mapId fails closed", () => {
    expect(() => resolveMapConfig(mapConfigFile.maps, "MoonBase")).toThrow();
  });
});
