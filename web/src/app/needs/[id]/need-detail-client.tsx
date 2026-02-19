"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { NeedDetail } from "@/types";
import { useUser } from "@/context/user-context";
import { BackLink } from "@/components/back-link";
import { BookmarkButton } from "@/components/bookmark-button";
import { TagBadge } from "@/components/tag-badge";
import { TrendIndicator } from "@/components/trend-indicator";
import { Sparkline } from "@/components/sparkline";
import { IntensityBar } from "@/components/needs/intensity-bar";
import { SourcePostList } from "@/components/needs/source-post-list";
import { BlurredOverlay } from "@/components/blurred-overlay";
import { OpportunityScore } from "@/components/opportunity-score";
import { toast } from "sonner";

interface NeedDetailClientProps {
  need: NeedDetail;
}

export function NeedDetailClient({ need }: NeedDetailClientProps) {
  const { tier, deepDivesUsedToday } = useUser();
  const [isBookmarked, setIsBookmarked] = useState(need.isBookmarked);

  const isOverLimit = tier !== "pro" && deepDivesUsedToday >= 3;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <BackLink href="/" label="Back" />
        <BookmarkButton
          isBookmarked={isBookmarked}
          onToggle={() => {
            setIsBookmarked(!isBookmarked);
            toast(
              isBookmarked ? "Removed from bookmarks" : "Saved to bookmarks"
            );
          }}
        />
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-2">
        &ldquo;{need.title}&rdquo;
      </h1>
      <div className="mb-6">
        <TagBadge tag={need.tag} />
      </div>

      {/* Frequency + Intensity — always visible (proof of value) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Frequency
          </h2>
          <p className="text-2xl font-bold">{need.frequency} posts</p>
          <div className="mt-3">
            <Sparkline
              data={need.sparklineData}
              width={300}
              height={40}
              className="w-full text-primary"
            />
          </div>
          <div className="mt-2">
            <TrendIndicator trend={need.trend} />
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Intensity
          </h2>
          <IntensityBar score={need.intensity} />
        </div>
      </div>

      {/* Source Posts — gated when over limit */}
      {isOverLimit ? (
        <BlurredOverlay
          title={`You've used ${deepDivesUsedToday} of 3 free deep dives today`}
          description="Upgrade to Pro for unlimited deep dives."
          ctaLabel="Upgrade to Pro — $9/mo"
          ctaHref="/pricing"
        >
          <div className="rounded-lg border p-4 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Source Posts
              <span className="ml-2 font-normal text-xs">
                {need.totalSourcePosts} total
              </span>
            </h2>
            <SourcePostList posts={need.sourcePosts} />
          </div>
        </BlurredOverlay>
      ) : (
        <div className="rounded-lg border p-4 sm:p-6 mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Source Posts
            <span className="ml-2 font-normal text-xs">
              {need.totalSourcePosts} total
            </span>
          </h2>
          <SourcePostList posts={need.sourcePosts} />
        </div>
      )}

      {/* Related Clusters */}
      {need.relatedClusters.length > 0 && (
        <div className="rounded-lg border p-4 sm:p-6 mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Related Clusters
          </h2>
          <div className="space-y-2">
            {need.relatedClusters.map((cluster) => (
              <Link
                key={cluster.id}
                href={`/needs/${cluster.id}`}
                className="flex items-center justify-between rounded-md p-2 -mx-2 hover:bg-accent transition-colors min-h-11 group"
              >
                <span className="text-sm">{cluster.title}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {cluster.postCount} posts
                  <ExternalLink
                    size={12}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related Brief */}
      {need.relatedBrief && (
        <div className="rounded-lg border p-4 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Related Brief
          </h2>
          <Link
            href={`/briefs/${need.relatedBrief.id}`}
            className="flex items-center justify-between rounded-md p-2 -mx-2 hover:bg-accent transition-colors min-h-11 group"
          >
            <span className="text-sm font-medium">
              {need.relatedBrief.title}
            </span>
            <div className="flex items-center gap-2">
              <OpportunityScore
                score={need.relatedBrief.opportunityScore}
                className="w-24"
              />
              <ExternalLink
                size={12}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
