"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BackLink,
  Chip,
  Button,
  Icon,
} from "@/src/shared/ui";
import { isSafeUrl } from "@/src/shared/lib/sanitize-url";
import {
  BriefBody,
  BriefCard,
  DemandSignals,
  ConfidenceBadge,
} from "@/src/entities/brief/ui";
import { BriefRating } from "@/src/features/rating/ui";

/* --------------------------------------------------------------------------
   Mock Data
   TODO: Replace with API data
   -------------------------------------------------------------------------- */
const MOCK_BRIEF = {
  slug: "better-expense-tracking-freelancers",
  title: "Better Expense Tracking for Freelancers",
  postCount: 47,
  platformCount: 3,
  recency: "30 days",
  tags: ["SaaS", "invoicing", "freelancer"],
  confidence: "high" as const,
  platforms: [
    { name: "Reddit", color: "bg-[#FF4500]", percentage: 62, postCount: 29 },
    {
      name: "Twitter / X",
      color: "bg-[#1DA1F2]",
      percentage: 28,
      postCount: 13,
    },
    { name: "Discord", color: "bg-[#5865F2]", percentage: 10, postCount: 5 },
  ],
  content: {
    problem:
      "Freelancers struggle to separate personal and business expenses automatically. Existing tools are bloated with enterprise features they don't need [1]. The core complaint is a mismatch between tool complexity and user sophistication: most freelancers need to track receipts, categorize spending, and get a clear picture of deductible expenses [2]. Instead, they're forced to navigate complex dashboards designed for 50-person accounting teams [3].",
    demandSignals: [
      "47 posts across 3 platforms in the last 30 days mention invoicing frustrations",
      'Highly upvoted threads on r/freelance requesting "dead simple" invoicing',
      "Multiple 1-star App Store reviews cite setup complexity as primary complaint",
    ],
    suggestedDirections: [
      {
        title: "AI-First Receipt Parsing & Classification",
        description:
          "Develop a mobile-first interface that uses advanced OCR and LLMs to not just read the total, but understand the context of the purchase [1] [3]",
      },
      {
        title: '"Tinder for Expenses" Workflow',
        description:
          "Gamify the reconciliation process. Connect bank feeds and allow users to swipe left (personal) or right (business) on transactions [2]",
      },
      {
        title: "Real-time Tax Liability Estimation",
        description:
          "Provide a running tally of estimated taxes owed based on classified income and expenses, removing the end-of-year surprise factor.",
      },
    ],
  },
  citations: [
    {
      id: 1,
      source: "reddit",
      sourceName: "r/freelance",
      date: "3 days ago",
      snippet:
        "I just want to create a clean invoice and email it. Why does every tool require me to set up a full business profile, connect my bank, and configure tax settings before I can send a single invoice?",
      originalUrl: "https://reddit.com/r/freelance/example1",
    },
    {
      id: 2,
      source: "reddit",
      sourceName: "r/SaaS",
      date: "1 week ago",
      snippet:
        "Tried FreshBooks, Wave, Zoho Invoice and QuickBooks this month. All of them feel like they were designed for accountants, not for a solo developer who just wants to bill clients.",
      originalUrl: "https://reddit.com/r/SaaS/example2",
    },
    {
      id: 3,
      source: "appstore",
      sourceName: "App Store",
      date: "2 weeks ago",
      snippet:
        "The app has so many features I don't need. I'm a freelance photographer. I don't need inventory management, payroll, or expense tracking. Let me invoice my clients without the MBA simulator.",
      originalUrl: "https://apps.apple.com/example3",
    },
  ],
  sourcePosts: [
    {
      id: "sp-1",
      source: "reddit" as const,
      sourceName: "r/freelance",
      username: "u/solo_designer",
      date: "3 days ago",
      title: "Why is every invoicing tool an enterprise product?",
      snippet:
        "I just want to create a clean invoice and email it. Why does every tool require me to set up a full business profile first?",
      originalUrl: "https://reddit.com/r/freelance/example1",
    },
    {
      id: "sp-2",
      source: "reddit" as const,
      sourceName: "r/SaaS",
      username: "u/dev_indie",
      date: "1 week ago",
      title: null,
      snippet:
        "Tried FreshBooks, Wave, Zoho Invoice and QuickBooks this month. All feel like they were designed for accountants, not solo devs.",
      originalUrl: "https://reddit.com/r/SaaS/example2",
    },
    {
      id: "sp-3",
      source: "appstore" as const,
      sourceName: "App Store",
      username: "PhotoPro_Jane",
      date: "2 weeks ago",
      title: null,
      snippet:
        "The app has so many features I don't need. I'm a freelance photographer. Just let me invoice my clients.",
      originalUrl: "https://apps.apple.com/example3",
    },
    {
      id: "sp-4",
      source: "reddit" as const,
      sourceName: "r/smallbusiness",
      username: "u/biz_owner_mike",
      date: "2 weeks ago",
      title: "Stop upselling me on payroll",
      snippet:
        "Every invoicing app tries to upsell me on payroll. I have zero employees. Stop showing me payroll features.",
      originalUrl: "https://reddit.com/r/smallbusiness/example4",
    },
    {
      id: "sp-5",
      source: "reddit" as const,
      sourceName: "r/freelance",
      username: "u/minimal_worker",
      date: "3 weeks ago",
      title: null,
      snippet:
        "Is there an invoicing tool that just does invoices? Not accounting, not CRM, not time tracking. Just invoices.",
      originalUrl: "https://reddit.com/r/freelance/example5",
    },
  ],
  relatedBriefs: [
    {
      id: "rb-1",
      title: "Affordable Error Monitoring for Indie Devs",
      postCount: 89,
      platformCount: 2,
      recency: "Active last 7 days",
      snippet:
        "Developers on small teams are frustrated with the pricing of existing error monitoring services.",
      tags: ["DevTools", "SaaS"],
      slug: "affordable-error-monitoring",
      confidence: "high" as const,
      trendLabel: "Trending up 24%",
    },
    {
      id: "rb-2",
      title: "Simple Project Management for Non-Technical Teams",
      postCount: 62,
      platformCount: 3,
      recency: "Active last 30 days",
      snippet:
        "Teams with non-technical members express frustration with the complexity of existing PM tools.",
      tags: ["Productivity", "SaaS"],
      slug: "simple-pm-non-technical",
      confidence: "medium" as const,
      trendLabel: "Steady",
    },
  ],
  filters: ["SaaS", "B2C", "< $10/mo", "Mobile-first"],
};

const TAG_ICONS: Record<string, string> = {
  SaaS: "credit-card",
  invoicing: "zap",
  freelancer: "briefcase",
};

/* --------------------------------------------------------------------------
   BriefDetailPage
   -------------------------------------------------------------------------- */
interface BriefDetailPageProps {
  slug: string;
}

export function BriefDetailPage({ slug }: BriefDetailPageProps) {
  const [showAllSources, setShowAllSources] = useState(false);

  // TODO: Replace with API data lookup based on slug
  const brief = MOCK_BRIEF;

  const INITIAL_SOURCE_COUNT = 3;
  const visibleSources = showAllSources
    ? brief.sourcePosts
    : brief.sourcePosts.slice(0, INITIAL_SOURCE_COUNT);
  const remainingCount = brief.sourcePosts.length - INITIAL_SOURCE_COUNT;

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

          {/* Aggregation meta */}
          <div className="mt-6">
            <DemandSignals
              postCount={brief.postCount}
              platformCount={brief.platformCount}
              recency={brief.recency}
            />
          </div>

          {/* Badge row: confidence + category tags */}
          <div className="flex flex-wrap items-center gap-2.5 mt-5">
            <ConfidenceBadge level={brief.confidence} />
            {brief.tags.map((tag) => (
              <Chip
                key={tag}
                variant="inactive"
                interactive={false}
                icon={TAG_ICONS[tag]}
              >
                {tag}
              </Chip>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-[#283039] my-8" />

          {/* Brief body sections */}
          <BriefBody
            content={brief.content}
            citations={brief.citations}
            platforms={brief.platforms}
          />

          {/* Divider */}
          <div className="border-t border-[#283039] my-8" />

          {/* ---- Key Source Posts ---- */}
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
                ({brief.sourcePosts.length})
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {visibleSources.map((post, idx) => (
                <SourcePostCard
                  key={post.id}
                  post={post}
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

          {/* Divider */}
          <div className="border-t border-[#283039] my-8" />

          {/* ---- Feedback footer ---- */}
          <section
            className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50"
            aria-label="Rate this brief"
          >
            <BriefRating briefId={brief.slug} />
          </section>
        </article>

        {/* ================================================================ */}
        {/* SIDEBAR                                                          */}
        {/* ================================================================ */}
        <aside className="hidden lg:flex flex-col gap-6 sticky top-8">
          {/* Your Filters card */}
          <div className="rounded-xl bg-gradient-to-br from-[#1a242d] to-[#141c24] border border-[#283039] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Icon
                name="sliders-horizontal"
                size={18}
                className="text-[#137fec]"
              />
              <h3 className="text-sm font-bold text-white">Your Filters</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {brief.filters.map((filter) => (
                <span
                  key={filter}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#137fec]/10 text-[#137fec] text-xs font-medium border border-[#137fec]/20"
                >
                  {filter}
                </span>
              ))}
            </div>
          </div>

          {/* Related Opportunities */}
          <div className="rounded-xl bg-[#1a242d] border border-[#283039] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Icon
                name="compass"
                size={18}
                className="text-[#137fec]"
              />
              <h3 className="text-sm font-bold text-white">
                Related Opportunities
              </h3>
            </div>

            <div className="flex flex-col gap-4">
              {brief.relatedBriefs.map((related) => (
                <Link
                  key={related.id}
                  href={`/briefs/${related.slug}`}
                  className="group block rounded-lg bg-[#141c24] border border-[#283039] p-4 hover:border-slate-600 transition-colors no-underline"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ConfidenceBadge level={related.confidence} />
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-[#137fec] transition-colors leading-snug mb-2">
                    {related.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="tabular-nums">
                      {related.postCount} posts
                    </span>
                    <span aria-hidden="true" className="text-slate-600">
                      |
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon
                        name="trending-up"
                        size={12}
                        className="text-emerald-400"
                      />
                      {related.trendLabel}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* View all link */}
            <Link
              href="/briefs"
              className={[
                "flex items-center justify-center gap-1.5 mt-4",
                "w-full py-2.5 rounded-lg",
                "border border-[#283039]",
                "text-xs font-semibold text-slate-400",
                "hover:text-white hover:border-slate-500",
                "transition-colors no-underline",
              ].join(" ")}
            >
              View all related
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
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
