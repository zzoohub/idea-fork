import type { Platform } from "@/shared/types";
import { PlatformIcon } from "@/shared/ui/platform-icon";

interface DemandSignalsProps {
  postCount: number;
  platforms: Platform[];
  recencyLabel: string;
}

export function DemandSignals({
  postCount,
  platforms,
  recencyLabel,
}: DemandSignalsProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="font-medium">{postCount} posts</span>
      <span aria-hidden="true">·</span>
      <span className="flex items-center gap-1">
        {platforms.length} platform{platforms.length !== 1 && "s"}
        <span className="inline-flex gap-0.5 ml-0.5">
          {platforms.map((p) => (
            <PlatformIcon key={p} platform={p} size={12} />
          ))}
        </span>
      </span>
      <span aria-hidden="true">·</span>
      <span>{recencyLabel}</span>
    </div>
  );
}
