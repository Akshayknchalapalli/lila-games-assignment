import type { HeatmapGrid, HeatmapOverlay, MapId } from "./types";

export function dayHeatmapUrl(mapId: MapId, dayId: string, overlay: HeatmapOverlay): string {
  return `/data/heatmaps/day/${mapId}/${dayId}/${overlay}.json`;
}

export function matchHeatmapUrl(matchId: string, overlay: HeatmapOverlay): string {
  return `/data/heatmaps/match/${encodeURIComponent(matchId)}/${overlay}.json`;
}

export async function loadHeatmap(url: string): Promise<HeatmapGrid> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load heatmap ${url}`);
  }
  return (await response.json()) as HeatmapGrid;
}

export function assertBinGrid(grid: HeatmapGrid): void {
  if (grid.columns !== 64 || grid.rows !== 64 || grid.counts.length !== 4096) {
    throw new Error("heatmap must be 64×64 with 4096 counts");
  }
}
