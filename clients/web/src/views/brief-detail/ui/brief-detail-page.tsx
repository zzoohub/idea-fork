"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Icon,
  ErrorState,
} from "@/src/shared/ui";
import { isSafeUrl } from "@/src/shared/lib/sanitize-url";
import {
  BriefBody,
  HeatBadge,
} from "@/src/entities/brief/ui";
import type { DemandSignalData } from "@/src/entities/brief/ui";
import { BriefRating } from "@/src/features/rating/ui";
import { fetchBrief } from "@/src/entities/brief/api";
import type { BriefDetail } from "@/src/shared/api";
import { extractDemandSignals } from "@/src/shared/lib/extract-demand-signals";
import { extractSubreddits } from "@/src/shared/lib/extract-subreddits";
import { computeHeatLevel } from "@/src/shared/lib/compute-heat-level";
import { formatTimeRange } from "@/src/shared/lib/format-time-range";
import { formatRelativeTime } from "@/src/shared/lib/format-relative-time";

/* --------------------------------------------------------------------------
   BriefDetailPage
   -------------------------------------------------------------------------- */
interface BriefDetailPageProps {
  slug: string;
}

export function BriefDetailPage({ slug }: BriefDetailPageProps) {
  const [brief, setBrief] = useState<BriefDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllSources, setShowAllSources] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchBrief(slug)
      .then((res) => {
        if (!cancelled) {
          setBrief(res.data);
          setLoading(false);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load brief.");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return <BriefDetailSkeleton />;
  if (error || !brief) return <ErrorState message={error ?? "Brief not found."} onRetry={() => window.location.reload()} />;

  /* Map API data to component interfaces */
  const parsed = extractDemandSignals(brief.demand_signals);
  const sourceSnapshots = brief.source_snapshots as Array<Record<string, unknown>>;
  const subreddits = extractSubreddits(sourceSnapshots);
  const heatLevel = computeHeatLevel({
    postCount: parsed.postCount,
    newestPostAt: parsed.newestPostAt,
  });
  const timeRange = formatTimeRange(parsed.oldestPostAt, parsed.newestPostAt);
  const avgCommentsPerPost = parsed.postCount > 0
    ? parsed.totalComments / parsed.postCount
    : 0;
  const communityVerdictPct =
    brief.upvote_count + brief.downvote_count > 0
      ? (brief.upvote_count / (brief.upvote_count + brief.downvote_count)) * 100
      : null;
  const freshness = parsed.newestPostAt
    ? formatRelativeTime(parsed.newestPostAt)
    : null;

  const demandSignalData: DemandSignalData = {
    complaintCount: parsed.postCount || brief.source_count,
    timeRange,
    subreddits,
    avgScore: parsed.avgScore,
    avgCommentsPerPost,
    communityVerdictPct,
    freshness,
  };

  const suggestedDirections = brief.solution_directions.map((dir) => ({
    title: dir,
    description: "",
  }));

  const citations = sourceSnapshots.slice(0, 5).map((snap, idx) => ({
    id: idx + 1,
    source: String(snap.source ?? "reddit"),
    sourceName: String(snap.source_name ?? snap.subreddit ?? "Unknown"),
    date: String(snap.date ?? ""),
    snippet: String(snap.snippet ?? snap.body ?? ""),
    originalUrl: String(snap.external_url ?? snap.url ?? "#"),
  }));

  const INITIAL_SOURCE_COUNT = 3;
  const visibleSources = showAllSources
    ? sourceSnapshots
    : sourceSnapshots.slice(0, INITIAL_SOURCE_COUNT);
  const remainingCount = sourceSnapshots.length - INITIAL_SOURCE_COUNT;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
        {/* ================================================================ */}
        {/* MAIN COLUMN                                                      */}
        {/* ================================================================ */}
        <article className="min-w-0" aria-labelledby="brief-title">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm">
              <li>
                <Link
                  href="/briefs"
                  className="text-slate-400 hover:text-slate-200 transition-colors no-underline"
                >
                  Briefs
                </Link>
              </li>
              <li aria-hidden="true">
                <Icon
                  name="chevron-right"
                  size={16}
                  className="text-slate-600"
                />
              </li>
              <li
                className="text-slate-200 font-medium truncate max-w-[300px]"
                aria-current="page"
              >
                {brief.title}
              </li>
            </ol>
          </nav>

          {/* Title */}
          <h1
            id="brief-title"
            className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight"
          >
            {brief.title}
          </h1>

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-5">
            <button
              type="button"
              className={[
                "inline-flex items-center gap-2",
                "px-4 py-2.5 rounded-lg",
                "border border-[#283039] bg-transparent",
                "text-sm font-semibold text-slate-300",
                "hover:border-slate-500 hover:text-white",
                "transition-colors cursor-pointer",
              ].join(" ")}
              aria-label="Save this brief"
            >
              <Icon name="bookmark" size={18} />
              Save
            </button>
            <button
              type="button"
              className={[
                "inline-flex items-center gap-2",
                "px-4 py-2.5 rounded-lg",
                "bg-[#137fec] text-white",
                "text-sm font-semibold",
                "hover:bg-[#1171d4]",
                "transition-colors cursor-pointer",
              ].join(" ")}
            >
              <Icon name="rocket" size={18} />
              Create Project
            </button>
          </div>

          {/* Heat badge */}
          <div className="flex flex-wrap items-center gap-2.5 mt-5">
            <HeatBadge level={heatLevel} />
          </div>

          {/* Divider */}
          <div className="border-t border-[#283039] my-8" />

          {/* Brief body sections */}
          <BriefBody
            content={{
              problem: brief.problem_statement,
              demandSignals: demandSignalData,
              suggestedDirections,
            }}
            citations={citations}
          />

          {/* Divider */}
          <div className="border-t border-[#283039] my-8" />

          {/* ---- Key Source Posts ---- */}
          {sourceSnapshots.length > 0 && (
            <section aria-labelledby="source-posts-heading">
              <div className="flex items-center gap-3 mb-6">
                <Icon
                  name="messages-square"
                  size={24}
                  className="text-[#137fec] shrink-0"
                />
                <h2
                  id="source-posts-heading"
                  className="text-xl font-bold text-white"
                >
                  Key Source Posts
                </h2>
                <span className="text-sm text-slate-500 tabular-nums">
                  ({sourceSnapshots.length})
                </span>
              </div>

              <div className="flex flex-col gap-4">
                {visibleSources.map((snap, idx) => (
                  <SourcePostCard
                    key={idx}
                    post={{
                      id: String(snap.id ?? idx),
                      source: String(snap.source ?? "reddit") as "reddit" | "appstore",
                      sourceName: String(snap.source_name ?? snap.subreddit ?? "Unknown"),
                      date: String(snap.date ?? ""),
                      title: snap.title ? String(snap.title) : null,
                      snippet: String(snap.snippet ?? snap.body ?? ""),
                      originalUrl: String(snap.external_url ?? snap.url ?? "#"),
                      username: snap.username ? String(snap.username) : undefined,
                    }}
                    sourceNumber={idx + 1}
                  />
                ))}
              </div>

              {/* Show more toggle */}
              {remainingCount > 0 && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowAllSources((prev) => !prev)}
                    className={[
                      "inline-flex items-center gap-2",
                      "text-sm font-semibold text-[#137fec]",
                      "hover:text-[#4da3f5]",
                      "transition-colors cursor-pointer",
                    ].join(" ")}
                  >
                    <Icon
                      name={showAllSources ? "chevron-up" : "chevron-down"}
                      size={18}
                    />
                    {showAllSources
                      ? "Show fewer posts"
                      : `Show ${remainingCount} more`}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Divider */}
          <div className="border-t border-[#283039] my-8" />

          {/* ---- Feedback footer ---- */}
          <section
            className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50"
            aria-label="Rate this brief"
          >
            <BriefRating briefId={brief.id} />
          </section>
        </article>

        {/* ================================================================ */}
        {/* SIDEBAR                                                          */}
        {/* ================================================================ */}
        <aside className="hidden lg:flex flex-col gap-6 sticky top-8">
          {/* Summary card */}
          <div className="rounded-xl bg-gradient-to-br from-[#1a242d] to-[#141c24] border border-[#283039] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Icon
                name="sparkles"
                size={18}
                className="text-[#137fec]"
              />
              <h3 className="text-sm font-bold text-white">Opportunity</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {brief.opportunity || brief.summary}
            </p>
          </div>

          {/* View all link */}
          <Link
            href="/briefs"
            className={[
              "flex items-center justify-center gap-1.5",
              "w-full py-2.5 rounded-lg",
              "border border-[#283039]",
              "text-xs font-semibold text-slate-400",
              "hover:text-white hover:border-slate-500",
              "transition-colors no-underline",
            ].join(" ")}
          >
            View all briefs
            <Icon name="arrow-right" size={14} />
          </Link>
        </aside>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   SourcePostCard
   -------------------------------------------------------------------------- */
interface SourcePost {
  id: string;
  source: "reddit" | "appstore";
  sourceName: string;
  username?: string;
  date: string;
  title?: string | null;
  snippet: string;
  originalUrl: string;
}

function SourcePostCard({
  post,
  sourceNumber,
}: {
  post: SourcePost;
  sourceNumber: number;
}) {
  const platformIcon = post.source === "reddit" ? "messages-square" : "smartphone";
  const platformColor =
    post.source === "reddit" ? "text-[#FF4500]" : "text-slate-400";
  const safeHref = isSafeUrl(post.originalUrl) ? post.originalUrl : undefined;

  const Tag = safeHref ? "a" : "div";
  const linkProps = safeHref
    ? { href: safeHref, target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  return (
    <Tag
      {...linkProps}
      className={[
        "group block p-5 rounded-xl",
        "bg-[#1a242d] border border-[#283039]",
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
        <span className="shrink-0 ml-3 text-xs font-semibold text-[#137fec] bg-[#137fec]/10 px-2.5 py-1 rounded-full">
          Source {sourceNumber}
        </span>
      </div>

      {/* Optional title */}
      {post.title && (
        <p className="text-white font-medium mb-2 leading-snug group-hover:text-[#137fec] transition-colors">
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

/* --------------------------------------------------------------------------
   Loading skeleton
   -------------------------------------------------------------------------- */
function BriefDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
        <div className="min-w-0 space-y-6">
          <div className="skeleton h-5 w-40 rounded" />
          <div className="skeleton h-10 w-3/4 rounded" />
          <div className="flex gap-3">
            <div className="skeleton h-10 w-24 rounded-lg" />
            <div className="skeleton h-10 w-36 rounded-lg" />
          </div>
          <div className="skeleton h-5 w-64 rounded" />
          <div className="border-t border-[#283039] my-8" />
          <div className="space-y-3">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-3/4 rounded" />
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="skeleton h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
