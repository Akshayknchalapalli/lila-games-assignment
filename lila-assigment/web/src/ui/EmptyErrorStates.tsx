type Props = {
  kind: "loading" | "empty" | "error" | "idle" | "prompt";
  message?: string;
};

export function EmptyErrorStates({ kind, message }: Props) {
  if (kind === "idle") return null;
  const title =
    kind === "loading"
      ? "Loading"
      : kind === "empty"
        ? "Nothing in this filter"
        : kind === "prompt"
          ? "Select a match"
          : "Cannot reconstruct match";
  const body =
    message ??
    (kind === "loading"
      ? "Fetching index and minimap — not the Parquet archive."
      : kind === "empty"
        ? "Try another map or day. The canvas is cleared."
        : kind === "prompt"
          ? "Journeys appear on this map after you pick a match."
          : "This view will never fall back to another map.");
  return (
    <div className={`state-card state-${kind}`} role="status">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
