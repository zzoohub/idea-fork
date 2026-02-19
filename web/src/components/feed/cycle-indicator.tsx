import { Clock } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { mockCycles } from "@/lib/mock-data";

export function CycleIndicator() {
  const latestCycle = mockCycles[0];
  const updatedTime = `${latestCycle.date}T12:00:00Z`;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock size={12} aria-hidden="true" />
      <span>Updated {formatRelativeTime(updatedTime)}</span>
    </div>
  );
}
