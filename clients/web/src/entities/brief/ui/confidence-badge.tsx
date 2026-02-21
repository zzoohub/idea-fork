import { Icon } from "@/src/shared/ui/icon";

interface ConfidenceBadgeProps {
  level: "high" | "medium" | "low";
  className?: string;
}

const LEVEL_CONFIG = {
  high: {
    icon: "circle-check",
    label: "High Confidence",
    containerClass:
      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    iconClass: "text-emerald-400",
  },
  medium: {
    icon: "info",
    label: "Medium Confidence",
    containerClass:
      "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    iconClass: "text-amber-400",
  },
  low: {
    icon: "triangle-alert",
    label: "Low Confidence",
    containerClass:
      "bg-red-500/10 text-red-400 border border-red-500/20",
    iconClass: "text-red-400",
  },
} as const;

/**
 * Displays a confidence level badge with icon and label.
 * Renders for all confidence levels (high, medium, low).
 */
export function ConfidenceBadge({ level, className }: ConfidenceBadgeProps) {
  const config = LEVEL_CONFIG[level];

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        config.containerClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-label={config.label}
    >
      <Icon
        name={config.icon}
        size={14}
        className={config.iconClass}
        filled
      />
      {config.label}
    </span>
  );
}
