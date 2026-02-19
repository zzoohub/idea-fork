import type { TagType } from "@/types";
import { TAG_CONFIG } from "@/lib/constants";

interface TagBadgeProps {
  tag: TagType;
  className?: string;
}

export function TagBadge({ tag, className }: TagBadgeProps) {
  const config = TAG_CONFIG[tag];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white ${className ?? ""}`}
      style={{ backgroundColor: config.color }}
    >
      {config.label}
    </span>
  );
}
