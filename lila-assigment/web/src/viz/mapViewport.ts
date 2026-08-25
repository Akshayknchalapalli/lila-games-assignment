export type MapViewport = {
  scale: number;
  panX: number;
  panY: number;
};

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;

export function defaultViewport(): MapViewport {
  return { scale: 1, panX: 0, panY: 0 };
}

export function clampZoom(scale: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

export function zoomAt(
  view: MapViewport,
  factor: number,
  originX: number,
  originY: number,
): MapViewport {
  const next = clampZoom(view.scale * factor);
  if (next === view.scale) return view;
  const contentX = (originX - view.panX) / view.scale;
  const contentY = (originY - view.panY) / view.scale;
  if (next === MIN_ZOOM) return defaultViewport();
  return {
    scale: next,
    panX: originX - contentX * next,
    panY: originY - contentY * next,
  };
}

export function panBy(view: MapViewport, dx: number, dy: number): MapViewport {
  if (view.scale <= MIN_ZOOM) return defaultViewport();
  return { ...view, panX: view.panX + dx, panY: view.panY + dy };
}

/** Keep the scaled map covering the frame (transform-origin 0 0). */
export function clampPan(view: MapViewport, width: number, height: number): MapViewport {
  if (view.scale <= MIN_ZOOM) return defaultViewport();
  const minX = width - width * view.scale;
  const minY = height - height * view.scale;
  return {
    ...view,
    panX: Math.min(0, Math.max(minX, view.panX)),
    panY: Math.min(0, Math.max(minY, view.panY)),
  };
}
