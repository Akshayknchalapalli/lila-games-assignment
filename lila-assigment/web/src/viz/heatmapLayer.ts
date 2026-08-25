import type { HeatmapGrid } from "../domain/types";
import { HEATMAP_COLORS } from "./visualLanguage";

export function rasterizeHeatmap(
  grid: HeatmapGrid,
  imageData: { width: number; height: number; data: Uint8ClampedArray },
): { width: number; height: number; data: Uint8ClampedArray } {
  if (grid.counts.length !== 4096) {
    throw new Error("heatmap draw uses aggregated 64×64 bins only (4096 counts)");
  }
  if (imageData.width !== 64 || imageData.height !== 64) {
    throw new Error("heatmap ImageData must be 64×64");
  }
  const [r, g, b] = HEATMAP_COLORS[grid.overlay];
  const max = grid.maxCount || 1;
  const pixels = imageData.data;
  for (let i = 0; i < 4096; i += 1) {
    const count = grid.counts[i] ?? 0;
    const t = count / max;
    const offset = i * 4;
    pixels[offset] = r;
    pixels[offset + 1] = g;
    pixels[offset + 2] = b;
    pixels[offset + 3] = count === 0 ? 0 : Math.round(40 + t * 180);
  }
  return imageData;
}

export function drawHeatmapOverlay(
  ctx: CanvasRenderingContext2D,
  grid: HeatmapGrid | null,
): void {
  if (!grid || grid.maxCount === 0) return;
  const imageData = ctx.createImageData(64, 64);
  rasterizeHeatmap(grid, imageData);
  const tmp = document.createElement("canvas");
  tmp.width = 64;
  tmp.height = 64;
  const tmpCtx = tmp.getContext("2d");
  if (!tmpCtx) return;
  tmpCtx.putImageData(imageData, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(tmp, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

export function measureHeatmapRasterMs(grid: HeatmapGrid, iterations = 20): number {
  const imageData = {
    width: 64,
    height: 64,
    data: new Uint8ClampedArray(64 * 64 * 4),
  };
  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    rasterizeHeatmap(grid, imageData);
  }
  return (performance.now() - start) / iterations;
}
