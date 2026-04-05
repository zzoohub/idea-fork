"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/src/shared/ui";
import { isSafeUrl } from "@/src/shared/lib/sanitize-url";
import { trackBriefSourceClicked } from "@/src/shared/analytics";

/* --------------------------------------------------------------------------
   Types
   -------------------------------------------------------------------------- */

export interface SourcePost {
  id: string;
  source: "reddit" | "appstore";
  sourceName: string;
  username?: string;
  date: string;
  title?: string | null;
  snippet: string;
  originalUrl: string;
}

/* --------------------------------------------------------------------------
   SourcePostCard
   -------------------------------------------------------------------------- */

export function SourcePostCard({
  post,
  sourceNumber,
  briefId,
}: {
  post: SourcePost;
  sourceNumber: number;
  briefId: number;
}) {
  const tCommon = useTranslations("common");
  const platformIcon = post.source === "reddit" ? "messages-square" : "smartphone";
  const platformColor =
    post.source === "reddit" ? "text-[#FF4500]" : "text-slate-400";
  const safeHref = isSafeUrl(post.originalUrl) ? post.originalUrl : undefined;

  const Tag = safeHref ? "a" : "div";
  const linkProps = safeHref
    ? { href: safeHref, target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  const handleClick = () => {
    trackBriefSourceClicked({
      brief_id: briefId,
      post_id: post.id,
      platform: post.source,
      source_position: sourceNumber,
    });
  };

  return (
    <Tag
      {...linkProps}
      onClick={handleClick}
      className={[
        "group block p-5 rounded-xl",
        "bg-surface-dark border border-border-dark",
        "hover:border-slate-600",
        "transition-colors no-underline",
      ].join(" ")}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Platform avatar */}
          <span
            className={`flex items-center justify-center size-8 rounded-full bg-slate-700/50 shrink-0 ${platformColor}`}
          >
            <Icon name={platformIcon} size={16} />
          </span>
          <div className="flex items-center gap-1.5 min-w-0 text-sm">
            {post.username && (
              <span className="text-slate-300 font-medium truncate">
                {post.username}
              </span>
            )}
            <span className="text-slate-500 shrink-0">{post.sourceName}</span>
            <span className="text-slate-600 shrink-0" aria-hidden="true">
              &middot;
            </span>
            <time className="text-slate-500 shrink-0">{post.date}</time>
          </div>
        </div>
        <span className="shrink-0 ml-3 text-xs font-semibold text-primary bg-[#137fec]/10 px-2.5 py-1 rounded-full">
          {tCommon("source", { number: sourceNumber })}
        </span>
      </div>

      {/* Optional title */}
      {post.title && (
        <p className="text-white font-medium mb-2 leading-snug group-hover:text-primary transition-colors">
          {post.title}
        </p>
      )}

      {/* Quote text */}
      <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">
        &ldquo;{post.snippet}&rdquo;
      </p>
    </Tag>
  );
}
