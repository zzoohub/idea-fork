interface OpportunityScoreProps {
  score: number; // 0-10
  className?: string;
}

export function OpportunityScore({ score, className }: OpportunityScoreProps) {
  const percentage = (score / 10) * 100;

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <div
        className="h-2 flex-1 rounded-full bg-muted"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-label={`Opportunity score: ${score} out of 10`}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium tabular-nums">{score.toFixed(1)}</span>
    </div>
  );
}
