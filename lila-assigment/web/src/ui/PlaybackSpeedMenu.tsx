import { useEffect, useRef, useState } from "react";
import { PLAYBACK_RATES, playbackSpeedLabel } from "../domain/playhead";

type Props = {
  rate: number;
  disabled: boolean;
  onRate: (rate: number) => void;
};

export function PlaybackSpeedMenu({ rate, disabled, onRate }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="speed-menu-wrap" ref={rootRef}>
      <button
        type="button"
        className="speed-toggle"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Playback speed"
        onClick={() => setOpen((current) => !current)}
      >
        {rate === 1 ? "1x" : `${rate}x`}
      </button>
      {open ? (
        <div className="speed-menu" role="menu" aria-label="Playback speed">
          <p className="speed-menu-title">Playback speed</p>
          {PLAYBACK_RATES.map((value) => (
            <div key={value} className="speed-menu-row">
              {value === 4 ? <span className="speed-menu-sep" /> : null}
              <button
                type="button"
                role="menuitemradio"
                aria-checked={rate === value}
                className={rate === value ? "on" : ""}
                onClick={() => {
                  onRate(value);
                  setOpen(false);
                }}
              >
                <span className="speed-check" aria-hidden>
                  {rate === value ? "✓" : ""}
                </span>
                {playbackSpeedLabel(value)}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
