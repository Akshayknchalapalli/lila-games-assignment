import type { PlayheadState } from "../domain/playhead";
import { MapLegend } from "./MapLegend";

type Props = {
  playhead: PlayheadState;
  onToggle: () => void;
  onSeek: (t: number) => void;
  matchSummary?: string | null;
};

function formatElapsed(t: number | null, tsMin: number | null, tsMax: number | null): string {
  if (t == null || tsMin == null || tsMax == null) return "— / —";
  const elapsed = Math.max(0, t - tsMin);
  const total = Math.max(0, tsMax - tsMin);
  return `${fmt(elapsed)} / ${fmt(total)}`;
}

function fmt(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Timeline({ playhead, onToggle, onSeek, matchSummary }: Props) {
  const disabled = playhead.matchId == null;
  return (
    <section className="timeline" aria-label="Playback">
      <div className="transport">
        <button
          type="button"
          className="play-btn"
          disabled={disabled}
          onClick={onToggle}
          aria-label={playhead.playing ? "Pause" : "Play"}
        >
          {playhead.playing ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          disabled={disabled}
          min={playhead.tsMin ?? 0}
          max={playhead.tsMax ?? 0}
          value={playhead.t ?? 0}
          onChange={(e) => onSeek(Number(e.target.value))}
        />
        <span className="time-label">
          {disabled ? "No match" : formatElapsed(playhead.t, playhead.tsMin, playhead.tsMax)}
        </span>
        {matchSummary ? <span className="match-chip">{matchSummary}</span> : null}
      </div>
      <MapLegend />
    </section>
  );
}
