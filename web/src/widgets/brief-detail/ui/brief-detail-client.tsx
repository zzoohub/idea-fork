"use client";

import { useState } from "react";
import Link from "next/link";
import type { BriefDetail } from "@/shared/types";
import { BackLink } from "@/shared/ui/back-link";
import { DemandSignals } from "@/shared/ui/demand-signals";
import { ConfidenceBadge } from "@/shared/ui/confidence-badge";
import { SourceSnippet } from "@/shared/ui/source-snippet";
import { RatingButtons } from "@/shared/ui/rating-buttons";

interface BriefDetailClientProps {
  brief: BriefDetail;
}

export function BriefDetailClient({ brief }: BriefDetailClientProps) {
  const [showAllSources, setShowAllSources] = useState(false);
  const visibleSources = showAllSources
    ? brief.sourceEvidence
    : brief.sourceEvidence.slice(0, 5);
  const hasLowConfidence = brief.sourceEvidence.length < 3;

  return (
    <div>
      {/* Back link */}
      <div className="mb-4">
        <BackLink href="/briefs" label="Back to Briefs" />
      </div>

      {/* Title */}
      <h1 className="text-2xl sm:text-[30px] font-bold tracking-tight leading-tight mb-3">
        {brief.title}
      </h1>

      {/* Demand signals */}
      <div className="mb-3">
        <DemandSignals
          postCount={brief.postCount}
          platforms={brief.platforms}
          recencyLabel={brief.recencyLabel}
        />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-6">
        {brief.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Low confidence badge */}
      {hasLowConfidence && (
        <div className="mb-6">
          <ConfidenceBadge />
        </div>
      )}

      {/* Brief body sections */}
      <div className="space-y-6 mb-8">
        {brief.sections.map((section) => (
          <div key={section.heading}>
            <h2 className="text-lg font-semibold mb-2">{section.heading}</h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              {section.body}
            </p>
          </div>
        ))}

        {/* Suggested Directions */}
        {brief.suggestedDirections.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">
              Suggested Directions
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-[15px] leading-relaxed text-muted-foreground">
              {brief.suggestedDirections.map((direction, i) => (
                <li key={i}>{direction}</li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Source Posts */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">
          Source Posts ({brief.sourceEvidence.length})
        </h2>
        <div className="space-y-3">
          {visibleSources.map((post) => (
            <SourceSnippet key={post.id} post={post} />
          ))}
        </div>
        {!showAllSources && brief.sourceEvidence.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAllSources(true)}
            className="mt-3 text-sm font-medium text-primary hover:underline min-h-11 sm:min-h-0"
          >
            Show all {brief.sourceEvidence.length} posts
          </button>
        )}
      </div>

      {/* Rating */}
      <div className="py-6 border-t mb-8">
        <RatingButtons />
      </div>

      {/* Related Briefs */}
      {brief.relatedBriefs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Related Briefs</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2">
            {brief.relatedBriefs.map((related) => (
              <Link
                key={related.id}
                href={`/briefs/${related.id}`}
                className="shrink-0 w-64 sm:w-auto rounded-lg border bg-card p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="text-sm font-semibold mb-1 line-clamp-2">
                  {related.title}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {related.postCount} posts
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
