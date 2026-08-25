import type { HeatmapOverlay } from "../domain/types";

type Props = {
  enabled: Record<HeatmapOverlay, boolean>;
  empty: Record<HeatmapOverlay, boolean>;
  onToggle: (overlay: HeatmapOverlay) => void;
};

const LABELS: Record<HeatmapOverlay, string> = {
  traffic: "Traffic",
  kill: "Kills",
  death: "Deaths",
};

export function HeatmapToggles({ enabled, empty, onToggle }: Props) {
  return (
    <section className="overlay-pills" aria-label="Heatmap overlays">
      {(Object.keys(LABELS) as HeatmapOverlay[]).map((overlay) => (
        <button
          key={overlay}
          type="button"
          className={`pill pill-${overlay} ${enabled[overlay] ? "on" : ""}`}
          aria-pressed={enabled[overlay]}
          onClick={() => onToggle(overlay)}
        >
          {LABELS[overlay]}
          {empty[overlay] ? <span className="pill-empty">0</span> : null}
        </button>
      ))}
    </section>
  );
}
