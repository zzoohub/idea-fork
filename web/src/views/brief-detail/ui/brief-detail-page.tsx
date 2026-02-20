"use client";

import { useState } from "react";
import {
  BackLink,
  Chip,
  Button,
  Divider,
  Skeleton,
} from "@/src/shared/ui";
import { BriefBody, BriefCard, DemandSignals, ConfidenceBadge } from "@/src/entities/brief/ui";
import { PostSnippet } from "@/src/entities/post/ui";
import { BriefRating } from "@/src/features/rating/ui";

/* --------------------------------------------------------------------------
   Mock Data
   TODO: Replace with API data
   -------------------------------------------------------------------------- */
const MOCK_BRIEF = {
  slug: "simple-invoicing-freelancers",
  title: "Simple Invoicing for Freelancers",
  postCount: 47,
  platformCount: 3,
  recency: "Active last 30 days",
  tags: ["SaaS", "invoicing", "freelancer"],
  content: {
    problem:
      "Freelancers and solo consultants consistently report that existing invoicing tools are bloated with enterprise features they don't need [1]. The core complaint is a mismatch between tool complexity and user sophistication: most freelancers need to create an invoice, send it, and get paid [2]. Instead, they're forced to navigate complex dashboards, set up tax configurations for jurisdictions that don't apply to them, and manage features designed for 50-person accounting teams [3].",
    demandSignals: [
      "47 posts across 3 platforms in the last 30 days mention invoicing frustrations",
      "Highly upvoted threads on r/freelance requesting \"dead simple\" invoicing",
      "Multiple 1-star App Store reviews cite setup complexity as primary complaint",
      "Growing subreddit discussions comparing tools explicitly seeking minimalism",
    ],
    suggestedDirections: [
      "Build a mobile-first invoicing app that generates a professional invoice in under 60 seconds",
      "Focus on three core flows: create invoice, send via email/link, receive payment notification",
      "Offer a one-time purchase or low-cost subscription ($5/mo) to differentiate from per-invoice pricing",
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
      date: "3 days ago",
      snippet:
        "I just want to create a clean invoice and email it. Why does every tool require me to set up a full business profile first?",
      originalUrl: "https://reddit.com/r/freelance/example1",
    },
    {
      id: "sp-2",
      source: "reddit" as const,
      sourceName: "r/SaaS",
      date: "1 week ago",
      snippet:
        "Tried FreshBooks, Wave, Zoho Invoice and QuickBooks this month. All feel like they were designed for accountants, not solo devs.",
      originalUrl: "https://reddit.com/r/SaaS/example2",
    },
    {
      id: "sp-3",
      source: "appstore" as const,
      sourceName: "App Store",
      date: "2 weeks ago",
      snippet:
        "The app has so many features I don't need. I'm a freelance photographer. Just let me invoice my clients.",
      originalUrl: "https://apps.apple.com/example3",
    },
    {
      id: "sp-4",
      source: "reddit" as const,
      sourceName: "r/smallbusiness",
      date: "2 weeks ago",
      snippet:
        "Every invoicing app tries to upsell me on payroll. I have zero employees. Stop showing me payroll features.",
      originalUrl: "https://reddit.com/r/smallbusiness/example4",
    },
    {
      id: "sp-5",
      source: "reddit" as const,
      sourceName: "r/freelance",
      date: "3 weeks ago",
      snippet:
        "Is there an invoicing tool that just does invoices? Not accounting, not CRM, not time tracking. Just invoices.",
      originalUrl: "https://reddit.com/r/freelance/example5",
    },
    {
      id: "sp-6",
      source: "appstore" as const,
      sourceName: "App Store",
      date: "1 month ago",
      snippet:
        "Setup took 20 minutes before I could create my first invoice. By comparison, I can write one in Google Docs in 2 minutes.",
      originalUrl: "https://apps.apple.com/example6",
    },
    {
      id: "sp-7",
      source: "reddit" as const,
      sourceName: "r/webdev",
      date: "1 month ago",
      snippet:
        "Built my own invoice generator in an afternoon because nothing on the market was simple enough. That shouldn't be necessary.",
      originalUrl: "https://reddit.com/r/webdev/example7",
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
    },
  ],
};

const INITIAL_SOURCE_COUNT = 5;

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

  const visibleSources = showAllSources
    ? brief.sourcePosts
    : brief.sourcePosts.slice(0, INITIAL_SOURCE_COUNT);

  const remainingCount = brief.sourcePosts.length - INITIAL_SOURCE_COUNT;

  // Uncomment to preview error state:
  // return (
  //   <div className="mx-auto max-w-[720px] px-layout-xs py-layout-sm">
  //     <ErrorState message="Failed to load brief." onRetry={() => {}} />
  //   </div>
  // );

  return (
    <article
      className="mx-auto w-full max-w-[720px] px-layout-xs py-layout-sm"
      aria-labelledby="brief-title"
    >
      {/* ---- Back link ---- */}
      <BackLink href="/briefs" label="Back to Briefs" />

      {/* ---- Title ---- */}
      <h1
        id="brief-title"
        className="mt-layout-sm text-display font-bold text-text-primary leading-[var(--leading-display)]"
      >
        {brief.title}
      </h1>

      {/* ---- Demand signals ---- */}
      <div className="mt-space-lg">
        <DemandSignals
          postCount={brief.postCount}
          platformCount={brief.platformCount}
          recency={brief.recency}
        />
      </div>

      {/* ---- Confidence badge (only if low confidence) ---- */}
      <div className="mt-space-md">
        <ConfidenceBadge sourceCount={brief.platformCount} />
      </div>

      {/* ---- Tags ---- */}
      <div className="mt-space-lg flex flex-wrap gap-space-xs">
        {brief.tags.map((tag) => (
          <Chip key={tag} variant="inactive" interactive={false}>
            {tag}
          </Chip>
        ))}
      </div>

      <Divider className="my-layout-md" />

      {/* ---- Brief body (Problem, Demand Signals, Directions) ---- */}
      <BriefBody content={brief.content} citations={brief.citations} />

      <Divider className="my-layout-md" />

      {/* ---- Source Posts ---- */}
      <section aria-labelledby="source-posts-heading">
        <h2
          id="source-posts-heading"
          className="text-h2 font-semibold text-text-primary leading-[var(--leading-h2)]"
        >
          Source Posts ({brief.postCount})
        </h2>

        <div className="mt-space-lg flex flex-col gap-space-xl">
          {visibleSources.map((post) => (
            <PostSnippet
              key={post.id}
              source={post.source}
              sourceName={post.sourceName}
              date={post.date}
              snippet={post.snippet}
              originalUrl={post.originalUrl}
            />
          ))}
        </div>

        {/* Show all / collapse toggle */}
        {remainingCount > 0 && (
          <div className="mt-space-lg">
            <Button
              variant="ghost"
              onClick={() => setShowAllSources((prev) => !prev)}
            >
              {showAllSources
                ? "Show fewer posts"
                : `Show all ${brief.postCount} posts`}
            </Button>
          </div>
        )}
      </section>

      <Divider className="my-layout-md" />

      {/* ---- Rating ---- */}
      <section aria-label="Rate this brief">
        <BriefRating briefId={brief.slug} />
      </section>

      <Divider className="my-layout-md" />

      {/* ---- Related Briefs ---- */}
      <section aria-labelledby="related-briefs-heading">
        <h2
          id="related-briefs-heading"
          className="text-h2 font-semibold text-text-primary leading-[var(--leading-h2)]"
        >
          Related Briefs
        </h2>

        <div
          className={[
            "mt-space-lg",
            /* Horizontal scroll on mobile, grid on desktop */
            "flex gap-card-gap overflow-x-auto lg:grid lg:grid-cols-2 lg:overflow-visible",
            /* Hide scrollbar on mobile */
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          ].join(" ")}
        >
          {brief.relatedBriefs.map((related) => (
            <div
              key={related.id}
              className="min-w-[280px] flex-shrink-0 lg:min-w-0"
            >
              <BriefCard
                title={related.title}
                postCount={related.postCount}
                platformCount={related.platformCount}
                recency={related.recency}
                snippet={related.snippet}
                tags={related.tags}
                slug={related.slug}
              />
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}
