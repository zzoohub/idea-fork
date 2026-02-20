import type { ReactNode } from "react";

type BadgeVariant =
  | "default"
  | "positive"
  | "negative"
  | "warning"
  | "frustrated"
  | "request"
  | "question"
  | "bug_report"
  | "high_confidence"
  | "trending_badge"
  | "emerging"
  | "new_badge";

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-bg-tertiary text-text-secondary",
  positive: "bg-positive/15 text-positive",
  negative: "bg-negative/15 text-negative",
  warning: "bg-warning/15 text-warning",
  frustrated:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50",
  request:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50",
  question:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50",
  bug_report:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50",
  high_confidence:
    "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  trending_badge:
    "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  emerging:
    "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  new_badge:
    "bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300",
};

/** Variants that render a leading pulsing dot indicator */
const DOT_VARIANTS = new Set<BadgeVariant>(["high_confidence"]);

/** Dot color mapped to variant for the pulse indicator */
const DOT_COLOR: Partial<Record<BadgeVariant, string>> = {
  high_confidence: "bg-green-500",
};

export function Badge({
  variant = "default",
  className = "",
  children,
}: BadgeProps) {
  const hasDot = DOT_VARIANTS.has(variant);

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {hasDot && (
        <span
          className={[
            "h-1.5 w-1.5 shrink-0 rounded-full animate-pulse",
            DOT_COLOR[variant],
          ].join(" ")}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
