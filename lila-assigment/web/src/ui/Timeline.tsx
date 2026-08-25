import type { PlayheadState } from "../domain/playhead";

type Props = {
  playhead: PlayheadState;
  onToggle: () => void;
  onSeek: (t: number) => void;
};

function formatElapsed(t: number | null, tsMin: number | null): string {
  if (t == null || tsMin == null) return "—";
  const ms = Math.max(0, t - tsMin);
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Timeline({ playhead, onToggle, onSeek }: Props) {
  const disabled = playhead.matchId == null;
  return (
    <section className="chrome-row timeline" aria-label="Playback">
      <button type="button" disabled={disabled} onClick={onToggle}>
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
        {disabled ? "Select a match" : formatElapsed(playhead.t, playhead.tsMin)}
      </span>
    </section>
  );
}
