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
        "text-slate-400 text-lg leading-relaxed",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      Aggregated from{" "}
      <span className="text-slate-200 font-medium tabular-nums">
        {postCount.toLocaleString()} posts
      </span>{" "}
      across{" "}
      <span className="text-slate-200 font-medium tabular-nums">
        {platformCount} {platformCount === 1 ? "platform" : "platforms"}
      </span>{" "}
      in the last{" "}
      <span className="text-slate-200 font-medium">{recency}</span>.
    </p>
  );
}
