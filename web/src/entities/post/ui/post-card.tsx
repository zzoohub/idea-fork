"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { FeedPost } from "@/shared/types";
import { PLATFORM_CONFIG } from "@/shared/config/constants";
import { PlatformIcon } from "@/shared/ui/platform-icon";
import { TagBadge } from "@/shared/ui/tag-badge";
import { RelativeTime } from "@/shared/ui/relative-time";
import { formatNumber, sanitizeExternalUrl, cn } from "@/shared/lib/utils";

interface PostCardProps {
  post: FeedPost;
  onTagClick?: (tag: string) => void;
}

export function PostCard({ post, onTagClick }: PostCardProps) {
  const platformConfig = PLATFORM_CONFIG[post.platform];

  return (
    <article
      className={cn(
        "group relative rounded-lg border border-l-4 bg-card p-4 transition-shadow hover:shadow-md",
        platformConfig.borderClass
      )}
    >
      {/* Header: platform + source + time */}
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <PlatformIcon platform={post.platform} size={14} />
        <span>{post.platformSubSource}</span>
        <span aria-hidden="true">·</span>
        <RelativeTime dateString={post.createdAt} />
      </div>

      {/* Excerpt */}
      <p className="text-sm leading-relaxed line-clamp-3 mb-3">
        &ldquo;{post.excerpt}&rdquo;
      </p>

      {/* Tags + engagement */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <button
          type="button"
          onClick={() => onTagClick?.(post.tag)}
          className="relative z-10"
        >
          <TagBadge tag={post.tag} />
        </button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto">
          {post.upvotes > 0 && (
            <span>{formatNumber(post.upvotes)} upvotes</span>
          )}
          {post.comments > 0 && (
            <span>{formatNumber(post.comments)} comments</span>
          )}
          {post.helpfulVotes != null && post.helpfulVotes > 0 && (
            <span>{formatNumber(post.helpfulVotes)} helpful</span>
          )}
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-4 pt-3 border-t text-sm">
        <a
          href={sanitizeExternalUrl(post.sourceUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors min-h-11 sm:min-h-0"
        >
          View original
          <ExternalLink size={12} aria-hidden="true" />
        </a>
        {post.relatedBriefId && (
          <Link
            href={`/briefs/${post.relatedBriefId}`}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline ml-auto min-h-11 sm:min-h-0"
          >
            Related Brief &rarr;
          </Link>
        )}
      </div>
    </article>
  );
}
