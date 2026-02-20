"use client";

import { ExternalLink } from "lucide-react";
import type { SourcePost } from "@/shared/types";
import { PlatformIcon } from "@/shared/ui/platform-icon";
import { RelativeTime } from "@/shared/ui/relative-time";
import { sanitizeExternalUrl } from "@/shared/lib/utils";

interface SourceSnippetProps {
  post: SourcePost;
}

export function SourceSnippet({ post }: SourceSnippetProps) {
  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <PlatformIcon platform={post.platform} size={14} />
        <span className="text-xs text-muted-foreground">
          {post.platformSubSource}
        </span>
        <span className="text-xs text-muted-foreground">·</span>
        <RelativeTime dateString={post.createdAt} className="text-xs" />
      </div>
      <p className="leading-relaxed text-muted-foreground mb-2">
        &ldquo;{post.excerpt}&rdquo;
      </p>
      <a
        href={sanitizeExternalUrl(post.sourceUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline min-h-11 sm:min-h-0"
      >
        View original
        <ExternalLink size={12} aria-hidden="true" />
      </a>
    </div>
  );
}
