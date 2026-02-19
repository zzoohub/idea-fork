"use client";

import { cn } from "@/shared/lib/utils";
import type { TagType } from "@/shared/types";
import { FILTERABLE_TAGS, TAG_CONFIG } from "@/shared/config/constants";

interface TagFilterPillsProps {
  activeTag: TagType | null;
  onTagChange: (tag: TagType | null) => void;
}

export function TagFilterPills({ activeTag, onTagChange }: TagFilterPillsProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none"
      role="radiogroup"
      aria-label="Filter by tag"
    >
      <button
        type="button"
        role="radio"
        aria-checked={activeTag === null}
        onClick={() => onTagChange(null)}
        className={cn(
          "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors min-h-11 flex items-center",
          activeTag === null
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-accent"
        )}
      >
        All
      </button>
      {FILTERABLE_TAGS.map((tag) => {
        const config = TAG_CONFIG[tag];
        const isActive = activeTag === tag;
        return (
          <button
            key={tag}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onTagChange(isActive ? null : tag)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors min-h-11 flex items-center",
              isActive
                ? "text-white"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            )}
            style={isActive ? { backgroundColor: config.color } : undefined}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
