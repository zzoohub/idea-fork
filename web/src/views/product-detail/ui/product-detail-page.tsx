"use client";

import { useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/src/shared/ui/material-icon";
import { Badge } from "@/src/shared/ui/badge";
import {
  ProductHeader,
  ComplaintSummary,
} from "@/src/entities/product/ui";
import { isSafeUrl } from "@/src/shared/lib/sanitize-url";

/* --------------------------------------------------------------------------
   Mock Data
   -------------------------------------------------------------------------- */

const MOCK_PRODUCT = {
  name: "Notion",
  category: "Productivity / Note-taking",
  description:
    "All-in-one workspace for notes, tasks, wikis, and databases.",
  websiteUrl: "https://notion.so",
  status: "Active",
};

const MOCK_STATS = {
  totalMentions: 1842,
  mentionsTrend: 12,
  criticalComplaints: 23,
  criticalTrend: 5,
  sentimentScore: 68,
};

const MOCK_THEMES = [
  { name: "Mobile Performance", count: 412 },
  { name: "Offline Mode", count: 287 },
  { name: "Search Quality", count: 198 },
];

const MOCK_AI_INSIGHT = {
  text: 'Users consistently praise Notion\'s flexibility but express significant frustration regarding **mobile app latency** and the lack of a true **offline mode**. Recent updates have sparked complaints about search functionality degradation.',
  hashtags: ["#Performance", "#Mobile", "#Search", "#Pricing"],
};

const MOCK_COMPLAINTS = [
  {
    id: "1",
    source: "reddit" as const,
    sourceLabel: "r/productivity",
    sourceColor: "bg-orange-500",
    sourceIcon: "r/",
    username: "u/workflow_optimizer",
    time: "2 hours ago",
    sentiment: "frustrated" as const,
    title: "Notion mobile app is practically unusable at this point",
    description:
      "Every time I open the app it takes 15+ seconds to load my workspace. I've tried clearing cache, reinstalling, everything. Desktop is fine but mobile is painful for quick captures.",
    upvotes: 847,
    comments: 234,
    originalUrl: "https://reddit.com/r/productivity/comments/example1",
  },
  {
    id: "2",
    source: "reddit" as const,
    sourceLabel: "r/Notion",
    sourceColor: "bg-orange-500",
    sourceIcon: "r/",
    username: "u/notion_poweruser",
    time: "5 hours ago",
    sentiment: "request" as const,
    title: "Offline mode is still not a thing in 2026?",
    description:
      "I travel frequently and rely on Notion for project management. The lack of true offline support means I lose access to critical documents during flights. This has been requested for years.",
    upvotes: 1203,
    comments: 456,
    originalUrl: "https://reddit.com/r/Notion/comments/example2",
  },
  {
    id: "3",
    source: "twitter" as const,
    sourceLabel: "Twitter/X",
    sourceColor: "bg-sky-500",
    sourceIcon: "X",
    username: "@saas_reviewer",
    time: "8 hours ago",
    sentiment: "frustrated" as const,
    title: "Search in Notion has gotten significantly worse after the last update",
    description:
      "I can no longer find documents that I KNOW exist in my workspace. The search ranking is completely broken. Had to resort to manual navigation through dozens of nested pages.",
    upvotes: 392,
    comments: 89,
    originalUrl: "https://twitter.com/saas_reviewer/status/example3",
  },
  {
    id: "4",
    source: "reddit" as const,
    sourceLabel: "r/SaaS",
    sourceColor: "bg-orange-500",
    sourceIcon: "r/",
    username: "u/startup_founder_42",
    time: "1 day ago",
    sentiment: "question" as const,
    title: "Is Notion's pricing justified for small teams?",
    description:
      "We're a 5-person startup and the per-seat pricing is adding up fast. The free tier limitations pushed us to paid but we're only using maybe 30% of the features.",
    upvotes: 156,
    comments: 67,
    originalUrl: "https://reddit.com/r/SaaS/comments/example4",
  },
  {
    id: "5",
    source: "appstore" as const,
    sourceLabel: "App Store",
    sourceColor: "bg-blue-500",
    sourceIcon: "A",
    username: "ProductiveUser2026",
    time: "2 days ago",
    sentiment: "bug_report" as const,
    title: "App crashes when opening databases with 500+ entries",
    description:
      "Consistent crash on iOS 19 when trying to open any database view with more than a few hundred rows. This worked fine three updates ago. Regression bug for sure.",
    upvotes: 78,
    comments: 23,
    originalUrl: "https://apps.apple.com/example5",
  },
];

const MOCK_RELATED_BRIEFS = [
  {
    id: "1",
    category: "UX Research",
    title: "Mobile productivity apps failing on core performance metrics",
    postCount: 45,
    confidence: "High",
    slug: "mobile-productivity-performance",
  },
  {
    id: "2",
    category: "Feature Gap",
    title: "Offline-first architecture demand in knowledge management tools",
    postCount: 32,
    confidence: "Medium",
    slug: "offline-first-knowledge-management",
  },
  {
    id: "3",
    category: "Competitive Intel",
    title: "Search functionality comparison across workspace platforms",
    postCount: 28,
    confidence: "High",
    slug: "search-comparison-workspace-platforms",
  },
];

const INITIAL_VISIBLE_COUNT = 4;

/* --------------------------------------------------------------------------
   Sentiment config
   -------------------------------------------------------------------------- */
const SENTIMENT_CONFIG: Record<
  string,
  { label: string; variant: "frustrated" | "request" | "question" | "bug_report" }
> = {
  frustrated: { label: "Frustrated", variant: "frustrated" },
  request: { label: "Feature Request", variant: "request" },
  question: { label: "Question", variant: "question" },
  bug_report: { label: "Bug Report", variant: "bug_report" },
};

/* --------------------------------------------------------------------------
   ProductDetailPage
   -------------------------------------------------------------------------- */

interface ProductDetailPageProps {
  slug: string;
}

export function ProductDetailPage({ slug }: ProductDetailPageProps) {
  const [showAllComplaints, setShowAllComplaints] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");

  // TODO: Replace with API data fetching using slug
  void slug;

  const visibleComplaints = showAllComplaints
    ? MOCK_COMPLAINTS
    : MOCK_COMPLAINTS.slice(0, INITIAL_VISIBLE_COUNT);

  const remainingCount = MOCK_COMPLAINTS.length - INITIAL_VISIBLE_COUNT;

  // Render bold text from markdown-style **bold** syntax
  function renderInsightText(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="text-white font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-1.5 text-sm">
          <li>
            <Link
              href="/products"
              className="text-slate-500 dark:text-slate-400 hover:text-[#137fec] transition-colors duration-150 no-underline"
            >
              Products
            </Link>
          </li>
          <li aria-hidden="true">
            <MaterialIcon
              name="chevron_right"
              size={16}
              className="text-slate-400 dark:text-slate-500"
            />
          </li>
          <li>
            <span className="text-slate-900 dark:text-slate-50 font-medium">
              {MOCK_PRODUCT.name}
            </span>
          </li>
        </ol>
      </nav>

      {/* Header grid: 2/3 main + 1/3 AI Insight sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: ProductHeader + Stats */}
        <div className="lg:col-span-2 space-y-6">
          <ProductHeader
            name={MOCK_PRODUCT.name}
            category={MOCK_PRODUCT.category}
            description={MOCK_PRODUCT.description}
            websiteUrl={MOCK_PRODUCT.websiteUrl}
            status={MOCK_PRODUCT.status}
          />

          <ComplaintSummary
            totalMentions={MOCK_STATS.totalMentions}
            mentionsTrend={MOCK_STATS.mentionsTrend}
            criticalComplaints={MOCK_STATS.criticalComplaints}
            criticalTrend={MOCK_STATS.criticalTrend}
            sentimentScore={MOCK_STATS.sentimentScore}
            themes={MOCK_THEMES}
          />
        </div>

        {/* Right column: AI Insight Summary */}
        <div className="lg:col-span-1">
          <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-800 to-[#18212F] p-6 h-full">
            {/* Decorative blur */}
            <div
              className="absolute -top-16 -right-16 size-48 rounded-full bg-[#137fec]/10 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-[#137fec]/15">
                  <MaterialIcon
                    name="auto_awesome"
                    size={20}
                    className="text-[#137fec]"
                    filled
                  />
                </div>
                <h2 className="text-base font-bold text-white">
                  AI Insight Summary
                </h2>
              </div>

              {/* Analysis text */}
              <p className="text-sm leading-relaxed text-slate-300">
                {renderInsightText(MOCK_AI_INSIGHT.text)}
              </p>

              {/* Hashtag chips */}
              <div className="flex flex-wrap gap-2 pt-2">
                {MOCK_AI_INSIGHT.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-slate-700/50 border border-slate-600 text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content grid: 3/4 complaints + 1/4 sidebar */}
      <div className="mt-10 grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Complaint feed */}
        <section className="xl:col-span-3" aria-labelledby="complaints-heading">
          {/* Section header with sort controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h2
              id="complaints-heading"
              className="text-xl font-bold text-slate-900 dark:text-slate-50"
            >
              User Complaints
              <span className="ml-2 text-base font-normal text-slate-500 dark:text-slate-400">
                ({MOCK_COMPLAINTS.length})
              </span>
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={[
                  "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#137fec]",
                  sortBy === "recent"
                    ? "bg-[#137fec] text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
                ].join(" ")}
                onClick={() => setSortBy("recent")}
              >
                Most Recent
              </button>
              <button
                type="button"
                className={[
                  "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#137fec]",
                  sortBy === "popular"
                    ? "bg-[#137fec] text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
                ].join(" ")}
                onClick={() => setSortBy("popular")}
              >
                Most Popular
              </button>
            </div>
          </div>

          {/* Complaint cards */}
          <div className="space-y-4">
            {visibleComplaints.map((complaint) => {
              const sentimentCfg = SENTIMENT_CONFIG[complaint.sentiment];
              return (
                <article
                  key={complaint.id}
                  className={[
                    "group p-5 rounded-2xl",
                    "bg-white dark:bg-[#18212F]",
                    "border border-slate-200 dark:border-[#283039]",
                    "hover:border-[#137fec]/50",
                    "transition-all duration-200",
                  ].join(" ")}
                >
                  {/* Top row: source + user + time + sentiment */}
                  <div className="flex items-center gap-3 mb-3">
                    {/* Source avatar */}
                    <div
                      className={[
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                        complaint.sourceColor,
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      {complaint.sourceIcon}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {complaint.username}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        in {complaint.sourceLabel}
                      </span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                        &middot;
                      </span>
                      <time className="text-xs text-slate-400 dark:text-slate-500">
                        {complaint.time}
                      </time>
                    </div>
                    {sentimentCfg && (
                      <Badge variant={sentimentCfg.variant}>
                        {sentimentCfg.label}
                      </Badge>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 group-hover:text-[#137fec] transition-colors duration-150 mb-1.5">
                    {complaint.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {complaint.description}
                  </p>

                  {/* Footer: actions */}
                  <div className="flex items-center gap-5 mt-4 pt-3 border-t border-slate-100 dark:border-[#283039]">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <MaterialIcon name="thumb_up" size={14} />
                      <span className="tabular-nums">{complaint.upvotes.toLocaleString()}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <MaterialIcon name="chat_bubble" size={14} />
                      <span className="tabular-nums">{complaint.comments.toLocaleString()}</span>
                    </span>
                    <span className="flex-1" />
                    {isSafeUrl(complaint.originalUrl) ? (
                      <a
                        href={complaint.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#137fec] hover:text-[#0f6bca] transition-colors duration-150"
                      >
                        View Original
                        <MaterialIcon name="open_in_new" size={14} />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">
                        View Original
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {/* Show more / fewer */}
          {remainingCount > 0 && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                className={[
                  "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl",
                  "text-sm font-semibold text-[#137fec]",
                  "bg-[#137fec]/5 hover:bg-[#137fec]/10",
                  "border border-[#137fec]/20",
                  "transition-colors duration-150 cursor-pointer",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#137fec]",
                ].join(" ")}
                onClick={() => setShowAllComplaints((prev) => !prev)}
              >
                <MaterialIcon
                  name={showAllComplaints ? "expand_less" : "expand_more"}
                  size={18}
                />
                {showAllComplaints
                  ? "Show fewer complaints"
                  : `Show all ${MOCK_COMPLAINTS.length} complaints`}
              </button>
            </div>
          )}
        </section>

        {/* Right sidebar */}
        <aside className="xl:col-span-1 space-y-6">
          {/* Related Briefs */}
          <section aria-labelledby="related-briefs-heading">
            <h3
              id="related-briefs-heading"
              className="text-base font-bold text-slate-900 dark:text-slate-50 mb-4"
            >
              Related Briefs
            </h3>

            <div className="space-y-3">
              {MOCK_RELATED_BRIEFS.map((brief) => (
                <Link
                  key={brief.id}
                  href={`/briefs/${brief.slug}`}
                  className="group block p-4 rounded-xl bg-white dark:bg-[#18212F] border border-slate-200 dark:border-[#283039] hover:shadow-md hover:border-[#137fec]/50 transition-all duration-200 no-underline"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="default">{brief.category}</Badge>
                    <MaterialIcon
                      name="arrow_forward"
                      size={16}
                      className="text-slate-400 group-hover:text-[#137fec] transition-colors duration-150"
                    />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#137fec] transition-colors duration-150 line-clamp-2 mb-2">
                    {brief.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <MaterialIcon name="article" size={14} />
                      <span className="tabular-nums">{brief.postCount}</span> posts
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MaterialIcon name="verified" size={14} className="text-[#137fec]" />
                      {brief.confidence}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Generate New Brief CTA */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#137fec] to-blue-700 p-6">
            {/* Decorative blur */}
            <div
              className="absolute -bottom-10 -left-10 size-36 rounded-full bg-white/10 blur-2xl"
              aria-hidden="true"
            />

            <div className="relative space-y-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/15">
                <MaterialIcon
                  name="auto_awesome"
                  size={22}
                  className="text-white"
                  filled
                />
              </div>
              <h3 className="text-base font-bold text-white">
                Generate New Brief
              </h3>
              <p className="text-sm text-blue-100 leading-relaxed">
                Create an AI-powered analysis brief from the latest complaint data.
              </p>
              <button
                type="button"
                className={[
                  "mt-2 w-full inline-flex items-center justify-center gap-2",
                  "px-4 py-2.5 rounded-xl",
                  "bg-white text-[#137fec] text-sm font-semibold",
                  "hover:bg-blue-50 active:bg-blue-100",
                  "transition-colors duration-150 cursor-pointer",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                ].join(" ")}
              >
                Create Brief
                <MaterialIcon name="arrow_forward" size={16} />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Loading Skeleton
   -------------------------------------------------------------------------- */
export function ProductDetailSkeleton() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      {/* Breadcrumbs skeleton */}
      <div className="flex items-center gap-2 mb-6">
        <div className="skeleton h-4 w-16 rounded" />
        <div className="skeleton h-4 w-4 rounded" />
        <div className="skeleton h-4 w-20 rounded" />
      </div>

      {/* Header grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* ProductHeader skeleton */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#283039]">
            <div className="flex items-start gap-6">
              <div className="skeleton size-24 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-3">
                <div className="skeleton h-8 w-48 rounded" />
                <div className="skeleton h-4 w-full max-w-md rounded" />
                <div className="skeleton h-4 w-40 rounded" />
              </div>
            </div>
          </div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-5 rounded-2xl border border-slate-200 dark:border-[#283039]">
                <div className="skeleton h-4 w-24 rounded mb-3" />
                <div className="skeleton h-8 w-20 rounded mb-2" />
                <div className="skeleton h-3 w-32 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* AI Insight skeleton */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 h-full space-y-4">
            <div className="flex items-center gap-2">
              <div className="skeleton size-9 rounded-lg bg-slate-700" />
              <div className="skeleton h-5 w-32 rounded bg-slate-700" />
            </div>
            <div className="space-y-2">
              <div className="skeleton h-3 w-full rounded bg-slate-700" />
              <div className="skeleton h-3 w-full rounded bg-slate-700" />
              <div className="skeleton h-3 w-3/4 rounded bg-slate-700" />
            </div>
            <div className="flex gap-2 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-6 w-20 rounded-full bg-slate-700" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content grid skeleton */}
      <div className="mt-10 grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 space-y-4">
          <div className="flex items-center justify-between mb-6">
            <div className="skeleton h-6 w-40 rounded" />
            <div className="flex gap-2">
              <div className="skeleton h-8 w-24 rounded-lg" />
              <div className="skeleton h-8 w-24 rounded-lg" />
            </div>
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl border border-slate-200 dark:border-[#283039]">
              <div className="flex items-center gap-3 mb-3">
                <div className="skeleton size-8 rounded-full" />
                <div className="skeleton h-4 w-40 rounded" />
              </div>
              <div className="skeleton h-5 w-3/4 rounded mb-2" />
              <div className="skeleton h-4 w-full rounded mb-1" />
              <div className="skeleton h-4 w-2/3 rounded" />
            </div>
          ))}
        </div>

        <div className="xl:col-span-1 space-y-6">
          <div className="skeleton h-5 w-28 rounded mb-4" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-[#283039]">
              <div className="skeleton h-5 w-16 rounded-full mb-2" />
              <div className="skeleton h-4 w-full rounded mb-1" />
              <div className="skeleton h-4 w-3/4 rounded mb-2" />
              <div className="skeleton h-3 w-24 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
