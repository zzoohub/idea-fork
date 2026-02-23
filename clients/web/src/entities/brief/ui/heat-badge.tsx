import { Icon } from "@/src/shared/ui/icon";
import type { HeatLevel } from "@/src/shared/lib/compute-heat-level";

interface HeatBadgeProps {
  level: HeatLevel;
  className?: string;
}

const LEVEL_CONFIG = {
  hot: {
    icon: "flame",
    label: "Hot",
    containerClass:
      "bg-red-500/10 text-red-400 border border-red-500/20",
    iconClass: "text-red-400",
  },
  growing: {
    icon: "trending-up",
    label: "Growing",
    containerClass:
      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    iconClass: "text-emerald-400",
  },
  steady: {
    icon: "activity",
    label: "Steady",
    containerClass:
      "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    iconClass: "text-blue-400",
  },
  new: {
    icon: "sparkles",
    label: "New",
    containerClass:
      "bg-slate-500/10 text-slate-400 border border-slate-500/20",
    iconClass: "text-slate-400",
  },
} as const;

export function HeatBadge({ level, className }: HeatBadgeProps) {
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
