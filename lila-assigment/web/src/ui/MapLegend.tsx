export function MapLegend() {
  return (
    <ul className="legend-bar" aria-label="Visual language">
      <li><span className="swatch human" /> Human path</li>
      <li><span className="swatch bot" /> Bot path</li>
      <li><span className="mk kill" /> Kill</li>
      <li><span className="mk killed" /> Killed</li>
      <li><span className="mk botkill" /> Bot kill</li>
      <li><span className="mk botkilled" /> Bot killed</li>
      <li><span className="mk loot" /> Loot</li>
      <li><span className="mk storm" /> Storm</li>
    </ul>
  );
}
