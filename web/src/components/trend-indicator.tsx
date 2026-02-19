import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { TrendDirection } from "@/types";

const trendConfig: Record<
  TrendDirection,
  { icon: typeof TrendingUp; label: string; className: string }
> = {
  growing: {
    icon: TrendingUp,
    label: "Growing",
    className: "text-green-600",
  },
  stable: {
    icon: Minus,
    label: "Stable",
    className: "text-muted-foreground",
  },
  declining: {
    icon: TrendingDown,
    label: "Declining",
    className: "text-red-600",
  },
};

interface TrendIndicatorProps {
  trend: TrendDirection;
  className?: string;
}

export function TrendIndicator({ trend, className }: TrendIndicatorProps) {
  const config = trendConfig[trend];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm ${config.className} ${className ?? ""}`}
    >
      <Icon size={14} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}
