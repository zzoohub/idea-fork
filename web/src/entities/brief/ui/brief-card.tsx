"use client";

import Link from "next/link";
import type { Brief } from "@/shared/types";
import { DemandSignals } from "@/shared/ui/demand-signals";
import { Chip } from "@/shared/ui/chip";

interface BriefCardProps {
  brief: Brief;
}

export function BriefCard({ brief }: BriefCardProps) {
  return (
    <article className="group relative rounded-lg border bg-card p-4 transition-shadow hover:shadow-md">
      <Link
        href={`/briefs/${brief.id}`}
        className="absolute inset-0 z-0"
        aria-label={`Read brief: ${brief.title}`}
      />

      <h3 className="relative z-10 text-base font-semibold leading-snug mb-2 pointer-events-none">
        {brief.title}
      </h3>

      <div className="relative z-10 mb-2 pointer-events-none">
        <DemandSignals
          postCount={brief.postCount}
          platforms={brief.platforms}
          recencyLabel={brief.recencyLabel}
        />
      </div>

      <p className="relative z-10 text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3 pointer-events-none">
        {brief.summary}
      </p>

      <div className="relative z-10 flex flex-wrap gap-1 pointer-events-none">
        {brief.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}
