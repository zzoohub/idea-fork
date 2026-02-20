import { Icon } from "@/src/shared/ui/icon";

interface ConfidenceBadgeProps {
  sourceCount: number;
  className?: string;
}

/**
 * Renders a low-confidence warning when sourceCount < 3.
 * Returns null if confidence is adequate.
 */
export function ConfidenceBadge({
  sourceCount,
  className,
}: ConfidenceBadgeProps) {
  if (sourceCount >= 3) {
    return null;
  }

  return (
    <div
      className={[
        "inline-flex items-center gap-space-sm rounded-card bg-warning/15 px-space-md py-space-xs",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-label={`Low confidence: only ${sourceCount} source${sourceCount === 1 ? "" : "s"}`}
    >
      <Icon name="warning" size={16} className="shrink-0 text-warning" />
      <div className="flex flex-col">
        <span className="text-body-sm font-semibold text-warning">
          Low confidence
        </span>
        <span className="text-caption text-text-secondary leading-[var(--leading-caption)]">
          Based on {sourceCount === 1 ? "1 source" : `${sourceCount} sources`}
          &mdash;more data needed
        </span>
      </div>
    </div>
  );
}
