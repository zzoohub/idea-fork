interface DemandSignalsProps {
  postCount: number;
  platformCount: number;
  recency: string;
  className?: string;
}

export function DemandSignals({
  postCount,
  platformCount,
  recency,
  className,
}: DemandSignalsProps) {
  return (
    <p
      className={[
        "text-body-sm font-semibold text-text-secondary leading-[var(--leading-body-sm)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="tabular-nums">{postCount.toLocaleString()}</span>
      {" posts"}
      <span aria-hidden="true" className="mx-space-xs text-text-tertiary">
        &middot;
      </span>
      <span className="tabular-nums">{platformCount}</span>
      {platformCount === 1 ? " platform" : " platforms"}
      <span aria-hidden="true" className="mx-space-xs text-text-tertiary">
        &middot;
      </span>
      <span>{recency}</span>
    </p>
  );
}
