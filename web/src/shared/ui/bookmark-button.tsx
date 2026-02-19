"use client";

import { Bookmark } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui/tooltip";

interface BookmarkButtonProps {
  isBookmarked: boolean;
  onToggle: () => void;
  className?: string;
}

export function BookmarkButton({
  isBookmarked,
  onToggle,
  className,
}: BookmarkButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onToggle();
          }}
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-md transition-colors hover:bg-accent",
            className
          )}
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
          aria-pressed={isBookmarked}
        >
          <Bookmark
            size={18}
            className={cn(
              "transition-colors",
              isBookmarked
                ? "fill-primary text-primary"
                : "text-muted-foreground"
            )}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {isBookmarked ? "Remove bookmark" : "Bookmark"}
      </TooltipContent>
    </Tooltip>
  );
}
