export type MapConfig = {
  mapId: string;
  scale: number;
  originX: number;
  originZ: number;
  imageWidth: number;
  imageHeight: number;
  displayName?: string;
  assetPath?: string;
};

export type Pixel = {
  pixelX: number;
  pixelY: number;
  inBounds: boolean;
};

export function resolveMapConfig(
  maps: Array<Pick<MapConfig, "mapId">>,
  mapId: string,
): MapConfig {
  const found = maps.find((row) => row.mapId === mapId) as MapConfig | undefined;
  if (!found) {
    throw new Error(`Unknown mapId: ${mapId}`);
  }
  if (
    !Number.isFinite(found.scale) ||
    found.scale === 0 ||
    !Number.isFinite(found.originX) ||
    !Number.isFinite(found.originZ)
  ) {
    throw new Error(`Invalid MapConfig for ${mapId}`);
  }
  return found;
}

export function worldToPixel(mapConfig: MapConfig, x: number, z: number): Pixel {
  if (!mapConfig?.mapId) {
    throw new Error("mapConfig is required");
  }
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    throw new Error("non-finite coordinates");
  }
  const width = mapConfig.imageWidth;
  const height = mapConfig.imageHeight;
  const u = (x - mapConfig.originX) / mapConfig.scale;
  const v = (z - mapConfig.originZ) / mapConfig.scale;
  const pixelX = u * width;
  const pixelY = (1 - v) * height;
  const inBounds = pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height;
  return { pixelX, pixelY, inBounds };
}
