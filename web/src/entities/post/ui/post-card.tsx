"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { FeedPost } from "@/shared/types";
import { PLATFORM_CONFIG } from "@/shared/config/constants";
import { PlatformIcon } from "@/shared/ui/platform-icon";
import { TagBadge } from "@/shared/ui/tag-badge";
import { RelativeTime } from "@/shared/ui/relative-time";
import { BookmarkButton } from "@/shared/ui/bookmark-button";
import { formatNumber, sanitizeExternalUrl, cn } from "@/shared/lib/utils";

interface PostCardProps {
  post: FeedPost;
  onBookmarkToggle: (postId: string) => void;
}

export function PostCard({ post, onBookmarkToggle }: PostCardProps) {
  const platformConfig = PLATFORM_CONFIG[post.platform];

  return (
    <article
      className={cn(
        "group relative rounded-lg border border-l-4 bg-card p-4 transition-shadow hover:shadow-md",
        platformConfig.borderClass
      )}
    >
      {/* Card click opens source */}
      <a
        href={sanitizeExternalUrl(post.sourceUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 z-0"
        aria-label={`Open original post on ${platformConfig.name} (opens in new tab)`}
      />

      {/* Header: platform + bookmark */}
      <div className="relative z-10 flex items-center justify-between mb-2">
        <PlatformIcon platform={post.platform} showName />
        <BookmarkButton
          isBookmarked={post.isBookmarked}
          onToggle={() => onBookmarkToggle(post.id)}
        />
      </div>

      {/* Excerpt */}
      <p className="relative z-10 text-sm leading-relaxed line-clamp-2 mb-3 pointer-events-none">
        &ldquo;{post.excerpt}&rdquo;
      </p>

      {/* Meta row: tag, engagement, time */}
      <div className="relative z-10 flex items-center gap-3 text-xs text-muted-foreground pointer-events-none">
        <TagBadge tag={post.tag} />
        {post.upvotes > 0 && (
          <span>{formatNumber(post.upvotes)} upvotes</span>
        )}
        {post.comments > 0 && (
          <span>{formatNumber(post.comments)} comments</span>
        )}
        {post.helpfulVotes != null && post.helpfulVotes > 0 && (
          <span>{formatNumber(post.helpfulVotes)} helpful</span>
        )}
        <RelativeTime dateString={post.createdAt} className="ml-auto" />
      </div>

      {/* Deep Dive link */}
      {post.needId && (
        <div className="relative z-10 mt-3 pt-3 border-t">
          <Link
            href={`/needs/${post.needId}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline min-h-11 sm:min-h-0"
            aria-label={`Deep dive into "${post.excerpt.slice(0, 50)}…"`}
          >
            Deep Dive
            <ExternalLink size={12} aria-hidden="true" />
          </Link>
        </div>
      )}
    </article>
  );
}
