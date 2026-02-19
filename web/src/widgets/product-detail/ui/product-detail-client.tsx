"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProductDetail } from "@/shared/types";
import { BackLink } from "@/shared/ui/back-link";
import { BookmarkButton } from "@/shared/ui/bookmark-button";
import { BriefSection } from "@/features/paywall";
import { PlatformIcon } from "@/shared/ui/platform-icon";
import { SentimentBadge } from "@/shared/ui/sentiment-badge";
import { SourcePostList } from "@/shared/ui/source-post-list";
import { TrendIndicator } from "@/shared/ui/trend-indicator";
import { Sparkline } from "@/shared/ui/sparkline";
import { toast } from "sonner";

interface ProductDetailClientProps {
  product: ProductDetail;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [isBookmarked, setIsBookmarked] = useState(product.isBookmarked);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <BackLink href="/products" label="Back to Products" />
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

      <h1 className="text-2xl font-bold tracking-tight mb-1">
        {product.name}
      </h1>
      <p className="text-xs text-muted-foreground mb-6">
        {product.category} &mdash; launched{" "}
        {new Date(product.launchDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      {/* Stacked sections */}
      <div className="space-y-4">
        {/* 1. Overview — always visible */}
        <BriefSection title="Overview">
          <p className="text-sm leading-relaxed mb-4">{product.description}</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              {product.platforms.map((platform) => (
                <PlatformIcon
                  key={platform}
                  platform={platform}
                  showName
                  size={14}
                />
              ))}
            </div>
            <SentimentBadge level={product.sentimentLevel} />
            <span className="text-xs text-muted-foreground">
              {product.complaintCount} total complaints
            </span>
          </div>
        </BriefSection>

        {/* 2. Complaint Breakdown — Pro only */}
        <BriefSection title="Complaint Breakdown" requiresPro>
          <div className="space-y-6">
            {product.complaintBreakdown.map((theme) => (
              <div key={theme.theme}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">{theme.theme}</h3>
                  <span className="text-xs text-muted-foreground">
                    {theme.postCount} posts
                  </span>
                </div>
                <SourcePostList posts={theme.posts} compact />
              </div>
            ))}
          </div>
        </BriefSection>

        {/* 3. Sentiment Trend — Pro only */}
        <BriefSection title="Sentiment Trend" requiresPro>
          <div className="flex items-center gap-6 mb-4">
            <div>
              <span className="text-xs text-muted-foreground">Trend</span>
              <div className="mt-1">
                <TrendIndicator trend={product.sentimentTrend} />
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">
                Top Issue
              </span>
              <p className="text-sm font-medium">{product.topIssue}</p>
            </div>
          </div>
          <Sparkline
            data={product.sparklineData}
            width={600}
            height={48}
            className="w-full text-primary"
          />
        </BriefSection>
      </div>

      {/* Related briefs */}
      {product.relatedBriefs.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Related briefs
          </h2>
          <div className="flex flex-wrap gap-2">
            {product.relatedBriefs.map((brief) => (
              <Link
                key={brief.id}
                href={`/briefs/${brief.id}`}
                className="rounded-full bg-secondary px-3 py-1.5 text-sm hover:bg-accent transition-colors min-h-[36px] flex items-center"
              >
                {brief.title}
                <span className="text-muted-foreground ml-1.5">
                  ({brief.postCount})
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
