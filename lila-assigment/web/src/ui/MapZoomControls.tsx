import { MAX_ZOOM, MIN_ZOOM } from "../viz/mapViewport";

type Props = {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

export function MapZoomControls({ scale, onZoomIn, onZoomOut, onReset }: Props) {
  return (
    <div
      className="zoom-controls"
      role="group"
      aria-label="Map zoom"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button type="button" onClick={onZoomIn} aria-label="Zoom in" disabled={scale >= MAX_ZOOM}>
        +
      </button>
      <button type="button" onClick={onReset} aria-label="Reset zoom">
        {Math.round(scale * 100)}%
      </button>
      <button type="button" onClick={onZoomOut} aria-label="Zoom out" disabled={scale <= MIN_ZOOM}>
        −
      </button>
    </div>
  );
}
