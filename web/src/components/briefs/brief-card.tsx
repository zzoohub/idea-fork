"use client";

import Link from "next/link";
import type { Brief } from "@/types";
import { PlatformIcon } from "@/components/platform-icon";
import { OpportunityScore } from "@/components/opportunity-score";
import { BookmarkButton } from "@/components/bookmark-button";

interface BriefCardProps {
  brief: Brief;
  onBookmarkToggle: (briefId: string) => void;
}

export function BriefCard({ brief, onBookmarkToggle }: BriefCardProps) {
  return (
    <article className="group relative rounded-lg border bg-card p-4 transition-shadow hover:shadow-md">
      <Link
        href={`/briefs/${brief.id}`}
        className="absolute inset-0 z-0"
        aria-label={`Read brief: ${brief.title}`}
      />

      <div className="relative z-10 flex items-start justify-between gap-2 mb-2">
        <h3 className="text-base font-semibold leading-snug">{brief.title}</h3>
        <BookmarkButton
          isBookmarked={brief.isBookmarked}
          onToggle={() => onBookmarkToggle(brief.id)}
        />
      </div>

      <p className="relative z-10 text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3 pointer-events-none">
        {brief.summary}
      </p>

      <div className="relative z-10 flex items-center gap-4 pointer-events-none">
        <span className="text-xs text-muted-foreground">
          {brief.postCount} posts
        </span>
        <div className="flex items-center gap-1">
          {brief.platforms.map((platform) => (
            <PlatformIcon key={platform} platform={platform} size={14} />
          ))}
        </div>
        <div className="ml-auto w-32">
          <OpportunityScore score={brief.opportunityScore} />
        </div>
      </div>
    </article>
  );
}
