type Props = {
  kind: "loading" | "empty" | "error" | "idle";
  message?: string;
};

export function EmptyErrorStates({ kind, message }: Props) {
  if (kind === "idle") return null;
  const title =
    kind === "loading"
      ? "Loading index…"
      : kind === "empty"
        ? "No journeys for this filter"
        : "Match cannot be reconstructed";
  const body =
    message ??
    (kind === "loading"
      ? "Fetching index.json and the minimap — not the raw Parquet archive."
      : kind === "empty"
        ? "The canvas is cleared. Try another map, day, or match."
        : "This view will never fall back to another map.");
  return (
    <div className={`state-card state-${kind}`} role="status">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
