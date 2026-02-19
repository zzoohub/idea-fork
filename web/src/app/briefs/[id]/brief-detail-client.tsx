"use client";

import { useState } from "react";
import Link from "next/link";
import type { BriefDetail } from "@/types";
import { BackLink } from "@/components/back-link";
import { BookmarkButton } from "@/components/bookmark-button";
import { BriefSection } from "@/components/briefs/brief-section";
import { SourceEvidenceList } from "@/components/briefs/source-evidence-list";
import { TrendIndicator } from "@/components/trend-indicator";
import { Sparkline } from "@/components/sparkline";
import { OpportunityScore } from "@/components/opportunity-score";
import { toast } from "sonner";

interface BriefDetailClientProps {
  brief: BriefDetail;
}

export function BriefDetailClient({ brief }: BriefDetailClientProps) {
  const [isBookmarked, setIsBookmarked] = useState(brief.isBookmarked);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <BackLink href="/briefs" label="Back to Briefs" />
        <BookmarkButton
          isBookmarked={isBookmarked}
          onToggle={() => {
            setIsBookmarked(!isBookmarked);
            toast(isBookmarked ? "Removed from bookmarks" : "Saved to bookmarks");
          }}
        />
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-1">{brief.title}</h1>
      <p className="text-xs text-muted-foreground mb-6">
        AI-generated brief &mdash;{" "}
        {new Date(brief.cycleDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}{" "}
        cycle
      </p>

      {/* Stacked sections */}
      <div className="space-y-4">
        {/* 1. Problem Summary — always visible */}
        <BriefSection title="Problem Summary">
          <p className="text-sm leading-relaxed">{brief.problemSummary}</p>
        </BriefSection>

        {/* 2. Source Evidence — Pro only */}
        <BriefSection title="Source Evidence" requiresPro>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground">
              {brief.sourceEvidence.length} posts
            </span>
          </div>
          <SourceEvidenceList sources={brief.sourceEvidence} />
        </BriefSection>

        {/* 3. Volume & Intensity — Pro only */}
        <BriefSection title="Volume & Intensity" requiresPro>
          <div className="flex flex-wrap items-center gap-6 mb-4">
            <div>
              <span className="text-xs text-muted-foreground">Mentions</span>
              <p className="text-lg font-semibold">{brief.volume}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Intensity</span>
              <p className="text-lg font-semibold capitalize">
                {brief.intensity}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Trend</span>
              <div className="mt-1">
                <TrendIndicator trend={brief.trend} />
              </div>
            </div>
          </div>
          <Sparkline
            data={brief.sparklineData}
            width={600}
            height={48}
            className="w-full text-primary"
          />
        </BriefSection>

        {/* 4. Existing Alternatives — Pro only */}
        <BriefSection title="Existing Alternatives" requiresPro>
          <div className="space-y-2">
            {brief.alternatives.map((alt) => (
              <div
                key={alt.name}
                className="flex items-start justify-between text-sm"
              >
                <div>
                  <span className="font-medium">{alt.name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    &mdash; &ldquo;{alt.sentiment}&rdquo;
                  </span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-4">
                  mentioned {alt.mentionCount}x
                </span>
              </div>
            ))}
          </div>
        </BriefSection>

        {/* 5. Opportunity Signal — Pro only */}
        <BriefSection title="Opportunity Signal" requiresPro>
          <p className="text-sm leading-relaxed mb-4">
            {brief.opportunitySignal}
          </p>
          <OpportunityScore score={brief.opportunityScore} />
        </BriefSection>
      </div>

      {/* Related needs */}
      {brief.relatedNeeds.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Related needs
          </h2>
          <div className="flex flex-wrap gap-2">
            {brief.relatedNeeds.map((need) => (
              <Link
                key={need.id}
                href={`/needs/${need.id}`}
                className="rounded-full bg-secondary px-3 py-1.5 text-sm hover:bg-accent transition-colors min-h-[36px] flex items-center"
              >
                {need.title}
                <span className="text-muted-foreground ml-1.5">
                  ({need.postCount})
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
