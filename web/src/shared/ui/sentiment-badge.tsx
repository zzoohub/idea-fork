import type { SentimentLevel } from "@/shared/types";
import { cn } from "@/shared/lib/utils";

const SENTIMENT_CONFIG: Record<
  SentimentLevel,
  { label: string; className: string }
> = {
  negative: {
    label: "Negative",
    className:
      "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  mixed: {
    label: "Mixed",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  positive: {
    label: "Positive",
    className:
      "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  },
};

interface SentimentBadgeProps {
  level: SentimentLevel;
  className?: string;
}

export function SentimentBadge({ level, className }: SentimentBadgeProps) {
  const config = SENTIMENT_CONFIG[level];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
