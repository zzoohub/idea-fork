interface IntensityBarProps {
  score: number; // 0-5
  className?: string;
}

const labels = ["Very Low", "Low", "Medium", "High", "Very High"];

function getLabel(score: number): string {
  const index = Math.min(Math.floor(score) - 1, labels.length - 1);
  return labels[Math.max(0, index)] ?? "Low";
}

export function IntensityBar({ score, className }: IntensityBarProps) {
  const percentage = (score / 5) * 100;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium capitalize">
          {getLabel(score)} ({score.toFixed(1)} / 5)
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full bg-muted"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-label={`Intensity: ${score.toFixed(1)} out of 5`}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
