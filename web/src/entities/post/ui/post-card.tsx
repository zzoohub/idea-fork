"use client";

import Link from "next/link";
import { MaterialIcon } from "@/src/shared/ui/material-icon";
import { Badge } from "@/src/shared/ui/badge";
import { isSafeUrl } from "@/src/shared/lib/sanitize-url";

/* --------------------------------------------------------------------------
   Types
   -------------------------------------------------------------------------- */

type PostSource = "reddit" | "twitter" | "linkedin" | "appstore";
type PostSentiment = "frustrated" | "request" | "question" | "bug_report";

interface PostCardProps {
  source: PostSource;
  sourceName: string;
  date: string;
  username?: string;
  title?: string;
  snippet: string;
  sentiment?: PostSentiment;
  category?: string;
  tags: string[];
  upvotes: number;
  commentCount?: number;
  originalUrl: string;
  briefSlug?: string;
  onTagClick?: (tag: string) => void;
}

/* --------------------------------------------------------------------------
   Sentiment badge label mapping
   -------------------------------------------------------------------------- */

const SENTIMENT_LABEL: Record<PostSentiment, string> = {
  frustrated: "Frustrated",
  request: "Request",
  question: "Question",
  bug_report: "Bug Report",
};

/* --------------------------------------------------------------------------
   Source avatars
   -------------------------------------------------------------------------- */

function SourceAvatar({ source }: { source: PostSource }) {
  const baseClasses =
    "size-8 shrink-0 rounded-full flex items-center justify-center text-white";

  switch (source) {
    case "reddit":
      return (
        <div className={`${baseClasses} bg-[#FF4500]`}>
          <span className="text-xs font-bold leading-none" aria-hidden="true">
            r/
          </span>
        </div>
      );
    case "twitter":
      return (
        <div className={`${baseClasses} bg-[#1DA1F2]`}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
      );
    case "linkedin":
      return (
        <div className={`${baseClasses} bg-[#0A66C2]`}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </div>
      );
    case "appstore":
      return (
        <div className={`${baseClasses} bg-slate-600`}>
          <MaterialIcon name="smartphone" size={16} />
        </div>
      );
  }
}

/* --------------------------------------------------------------------------
   PostCard
   -------------------------------------------------------------------------- */

export function PostCard({
  source,
  sourceName,
  date,
  username,
  title,
  snippet,
  sentiment,
  category,
  tags,
  upvotes,
  commentCount,
  originalUrl,
  briefSlug,
  onTagClick,
}: PostCardProps) {
  return (
    <article
      className={[
        "group",
        "rounded-xl border border-slate-200 dark:border-[#283039]",
        "bg-white dark:bg-[#1b2531]",
        "p-5",
        "hover:border-[#137fec]/50",
        "transition-colors duration-200",
      ].join(" ")}
    >
      {/* Row 1: Source info + badges */}
      <div className="flex justify-between items-start gap-3">
        {/* Left: Source avatar + meta */}
        <div className="flex items-start gap-2.5 min-w-0">
          <SourceAvatar source={source} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {sourceName}
              </span>
              <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">
                &middot;
              </span>
              <time className="text-slate-400 dark:text-slate-500 shrink-0">
                {date}
              </time>
            </div>
            {username && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                {username}
              </p>
            )}
          </div>
        </div>

        {/* Right: Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {sentiment && (
            <Badge variant={sentiment}>{SENTIMENT_LABEL[sentiment]}</Badge>
          )}
          {category && <Badge variant="default">{category}</Badge>}
        </div>
      </div>

      {/* Row 2: Title + snippet */}
      <div className="mt-3">
        {title && (
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#137fec] transition-colors duration-200">
            {title}
          </h3>
        )}
        <p
          className={[
            "text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3",
            title ? "mt-1" : "",
          ].join(" ")}
        >
          {snippet}
        </p>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {tags.map((tag) => {
            const tagClasses = [
              "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
              "bg-slate-100 dark:bg-[#283039] text-slate-600 dark:text-slate-400",
            ].join(" ");

            if (onTagClick) {
              return (
                <button
                  key={tag}
                  type="button"
                  className={`${tagClasses} hover:bg-slate-200 dark:hover:bg-[#2f3a47] cursor-pointer transition-colors duration-150`}
                  onClick={() => onTagClick(tag)}
                >
                  {tag}
                </button>
              );
            }

            return (
              <span key={tag} className={tagClasses}>
                {tag}
              </span>
            );
          })}
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-slate-100 dark:bg-[#283039] mt-4 mb-3" />

      {/* Footer: Stats + links */}
      <div className="flex items-center justify-between">
        {/* Stats */}
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
            <MaterialIcon name="arrow_upward" size={16} className="text-slate-400 dark:text-slate-500" />
            <span className="tabular-nums">{upvotes.toLocaleString()}</span>
          </span>
          {commentCount !== undefined && (
            <span className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
              <MaterialIcon name="chat_bubble" size={16} className="text-slate-400 dark:text-slate-500" />
              <span className="tabular-nums">{commentCount.toLocaleString()}</span>
            </span>
          )}
        </div>

        {/* Links */}
        <div className="flex items-center gap-3">
          {isSafeUrl(originalUrl) ? (
            <a
              href={originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors duration-150"
            >
              View Original
              <MaterialIcon name="open_in_new" size={14} />
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm text-slate-400 dark:text-slate-600">
              View Original
            </span>
          )}

          {briefSlug && (
            <>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">|</span>
              <Link
                href={`/briefs/${briefSlug}`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#137fec] hover:text-[#0f6bd0] transition-colors duration-150"
              >
                <MaterialIcon name="bolt" size={16} />
                Related Brief
              </Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
