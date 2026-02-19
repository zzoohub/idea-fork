import { ExternalLink } from "lucide-react";
import type { SourcePost } from "@/types";
import { PlatformIcon } from "@/components/platform-icon";
import { formatRelativeTime, formatNumber, sanitizeExternalUrl } from "@/lib/utils";

interface SourcePostListProps {
  posts: SourcePost[];
}

export function SourcePostList({ posts }: SourcePostListProps) {
  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <a
          key={post.id}
          href={sanitizeExternalUrl(post.sourceUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-md p-3 -mx-3 hover:bg-accent transition-colors group min-h-11"
          aria-label={`"${post.excerpt}" on ${post.platformSubSource} (opens in new tab)`}
        >
          <PlatformIcon
            platform={post.platform}
            size={16}
            className="mt-0.5 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-relaxed line-clamp-2">
              &ldquo;{post.excerpt}&rdquo;
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {post.upvotes != null && post.upvotes > 0 && (
                <span>{formatNumber(post.upvotes)} upvotes</span>
              )}
              {post.helpfulVotes != null && post.helpfulVotes > 0 && (
                <span>{formatNumber(post.helpfulVotes)} helpful</span>
              )}
              <span>{formatRelativeTime(post.createdAt)}</span>
            </div>
          </div>
          <ExternalLink
            size={14}
            className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors mt-1"
            aria-hidden="true"
          />
        </a>
      ))}
    </div>
  );
}
