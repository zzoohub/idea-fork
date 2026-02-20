"use client";

import Link from "next/link";
import { Card } from "@/src/shared/ui/card";
import { Chip } from "@/src/shared/ui/chip";
import { Icon } from "@/src/shared/ui/icon";
import { isSafeUrl } from "@/src/shared/lib/sanitize-url";

interface PostCardProps {
  source: "reddit" | "appstore";
  sourceName: string;
  date: string;
  snippet: string;
  tags: string[];
  upvotes: number;
  originalUrl: string;
  briefSlug?: string;
  onTagClick?: (tag: string) => void;
}

export function PostCard({
  source,
  sourceName,
  date,
  snippet,
  tags,
  upvotes,
  originalUrl,
  briefSlug,
  onTagClick,
}: PostCardProps) {
  const iconName = source === "reddit" ? "reddit" : "app-store";

  return (
    <Card as="article">
      {/* Header: source icon + name + date */}
      <div className="flex items-center gap-space-sm text-body-sm text-text-secondary">
        <Icon name={iconName} size={18} className="shrink-0" />
        <span className="font-semibold">{sourceName}</span>
        <span aria-hidden="true" className="text-text-tertiary">
          &middot;
        </span>
        <time className="text-text-tertiary">{date}</time>
      </div>

      {/* Snippet */}
      <p className="mt-space-md text-body text-text-primary leading-[var(--leading-body)] line-clamp-3">
        &ldquo;{snippet}&rdquo;
      </p>

      {/* Tags + upvotes row */}
      <div className="mt-space-md flex items-center justify-between gap-space-md">
        <div className="flex flex-wrap gap-space-xs">
          {tags.map((tag) => (
            <Chip
              key={tag}
              variant="inactive"
              interactive={!!onTagClick}
              {...(onTagClick
                ? { onClick: () => onTagClick(tag) }
                : { interactive: false as const })}
            >
              {tag}
            </Chip>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-space-xs text-body-sm text-text-secondary">
          <Icon name="thumbs-up" size={14} />
          <span className="tabular-nums">{upvotes.toLocaleString()}</span>
        </div>
      </div>

      {/* Footer: actions */}
      <div className="mt-space-lg flex items-center gap-space-lg border-t border-border pt-space-md">
        {isSafeUrl(originalUrl) ? (
          <a
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-space-xs text-body-sm text-text-secondary hover:text-text-primary transition-colors"
            style={{
              transitionDuration: "var(--duration-fast)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            View original
            <Icon name="external-link" size={14} />
          </a>
        ) : (
          <span className="inline-flex items-center gap-space-xs text-body-sm text-text-tertiary">
            View original
          </span>
        )}

        {briefSlug && (
          <Link
            href={`/briefs/${briefSlug}`}
            className="ml-auto inline-flex items-center gap-space-xs text-body-sm font-semibold text-interactive hover:text-interactive-hover transition-colors"
            style={{
              transitionDuration: "var(--duration-fast)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            Related Brief
            <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
      </div>
    </Card>
  );
}
