import type { HeatmapOverlay } from "../domain/types";

type Props = {
  enabled: Record<HeatmapOverlay, boolean>;
  empty: Record<HeatmapOverlay, boolean>;
  onToggle: (overlay: HeatmapOverlay) => void;
};

const LABELS: Record<HeatmapOverlay, string> = {
  traffic: "Traffic",
  kill: "Kill zones",
  death: "Death zones",
};

export function HeatmapToggles({ enabled, empty, onToggle }: Props) {
  return (
    <section className="chrome-row" aria-label="Heatmap overlays">
      {(Object.keys(LABELS) as HeatmapOverlay[]).map((overlay) => (
        <label key={overlay} className="toggle">
          <input
            type="checkbox"
            checked={enabled[overlay]}
            onChange={() => onToggle(overlay)}
          />
          {LABELS[overlay]}
          {empty[overlay] ? <em> empty</em> : null}
        </label>
      ))}
    </section>
  );
}
