"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, Suspense } from "react";
import { Skeleton, EmptyState, Icon } from "@/src/shared/ui";
import { BriefCard } from "@/src/entities/brief/ui";

/* --------------------------------------------------------------------------
   Mock Data
   TODO: Replace with API data
   -------------------------------------------------------------------------- */
const MOCK_BRIEFS = [
  {
    id: "1",
    title: "Better Expense Tracking for Freelancers",
    postCount: 47,
    platformCount: 3,
    recency: "2h ago",
    snippet:
      "Freelancers struggle with multi-currency support and manual entry in current solutions. Users complain about lack of tax categorizations and poor mobile receipt scanning.",
    tags: ["#Fintech", "#B2B"],
    slug: "better-expense-tracking-freelancers",
    confidence: "high" as const,
    sourcePlatforms: [
      { name: "Reddit", color: "bg-[#FF4500]", letter: "R" },
      { name: "Twitter", color: "bg-[#1DA1F2]", letter: "X" },
    ],
  },
  {
    id: "2",
    title: "AI-Powered Legal Document Review",
    postCount: 128,
    platformCount: 2,
    recency: "5h ago",
    snippet:
      "Small law firms are overwhelmed. Lawyers spend 40% of their time reviewing boilerplate contracts manually. Strong demand for a 'Junior Associate AI' that highlights risks.",
    tags: ["#LegalTech", "#SaaS"],
    slug: "ai-legal-document-review",
    confidence: "trending" as const,
    sourcePlatforms: [
      { name: "LinkedIn", color: "bg-[#0077B5]", letter: "in" },
      { name: "HackerNews", color: "bg-slate-700", letter: "Y" },
    ],
  },
  {
    id: "3",
    title: "Cross-Platform Social Scheduling for SMBs",
    postCount: 83,
    platformCount: 2,
    recency: "1d ago",
    snippet:
      "Small business owners need a way to schedule posts across TikTok, Reels, and Shorts simultaneously. Current tools are too enterprise-focused or expensive.",
    tags: ["#Marketing", "#SMB"],
    slug: "cross-platform-social-scheduling",
    confidence: "emerging" as const,
    sourcePlatforms: [
      { name: "Reddit", color: "bg-[#FF4500]", letter: "R" },
      {
        name: "Instagram",
        color: "bg-gradient-to-br from-purple-500 to-orange-400",
        letter: "\ud83d\udcf7",
      },
    ],
  },
  {
    id: "4",
    title: "Personalized Nutrition Plans via DNA",
    postCount: 204,
    platformCount: 2,
    recency: "3d ago",
    snippet:
      "People want actionable meal plans based on 23andMe data. Complaints center on generic advice from current apps that don't account for specific genetic markers.",
    tags: ["#Health", "#Consumer"],
    slug: "personalized-nutrition-dna",
    confidence: "high" as const,
    sourcePlatforms: [
      { name: "Twitter", color: "bg-[#1DA1F2]", letter: "X" },
    ],
  },
  {
    id: "5",
    title: "Virtual Event Networking That Works",
    postCount: 62,
    platformCount: 1,
    recency: "4d ago",
    snippet:
      "Attendees at virtual conferences feel isolated. They want better ways to serendipitously connect with others online, mimicking 'hallway track' conversations.",
    tags: ["#Events", "#Video"],
    slug: "virtual-event-networking",
    confidence: "trending" as const,
    sourcePlatforms: [
      { name: "LinkedIn", color: "bg-[#0077B5]", letter: "in" },
    ],
  },
  {
    id: "6",
    title: "Smart Home Energy Management",
    postCount: 31,
    platformCount: 3,
    recency: "1w ago",
    snippet:
      "Homeowners want to reduce their energy bills automatically. They need a dashboard that integrates with legacy meters and offers predictive savings tips.",
    tags: ["#IoT", "#GreenTech"],
    slug: "smart-home-energy-management",
    confidence: "new" as const,
    sourcePlatforms: [
      { name: "Reddit", color: "bg-[#FF4500]", letter: "R" },
      { name: "HackerNews", color: "bg-slate-700", letter: "Y" },
      { name: "Twitter", color: "bg-[#1DA1F2]", letter: "X" },
    ],
  },
];

const CATEGORIES = [
  "All Briefs",
  "SaaS",
  "Fintech",
  "Health",
  "Developer Tools",
  "Consumer",
];

/* --------------------------------------------------------------------------
   BriefsListingInner -- client component
   -------------------------------------------------------------------------- */
function BriefsListingInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeCategory = searchParams.get("category") ?? "All Briefs";
  const sortBy = searchParams.get("sort") ?? "trending";

  const handleCategoryChange = useCallback(
    (category: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (category === "All Briefs") {
        params.delete("category");
      } else {
        params.set("category", category);
      }
      const qs = params.toString();
      router.push(qs ? `/briefs?${qs}` : "/briefs", { scroll: false });
    },
    [searchParams, router],
  );

  const handleSortChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "trending") {
        params.delete("sort");
      } else {
        params.set("sort", value);
      }
      const qs = params.toString();
      router.push(qs ? `/briefs?${qs}` : "/briefs", { scroll: false });
    },
    [searchParams, router],
  );

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
          AI Briefs
        </h1>
        <p className="mt-3 text-lg text-slate-600 dark:text-[#9dabb9] font-light max-w-2xl">
          Product opportunities synthesized from real user complaints across
          Reddit, Twitter, and other platforms.
        </p>
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-[73px] z-40 -mx-6 px-6 py-4 border-b border-slate-200 dark:border-[#283039] backdrop-blur-xl bg-white/80 dark:bg-[#101922]/80">
        <div className="flex items-center justify-between gap-4">
          {/* Category chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((category) => {
              const isActive = category === activeCategory;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategoryChange(category)}
                  className={[
                    "shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                      : "bg-slate-100 dark:bg-[#1c2127] text-slate-600 dark:text-[#9dabb9] hover:bg-slate-200 dark:hover:bg-[#283039]",
                  ].join(" ")}
                  aria-pressed={isActive}
                >
                  {category}
                </button>
              );
            })}
          </div>

          {/* Sort dropdown */}
          <button
            type="button"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-[#9dabb9] hover:bg-slate-100 dark:hover:bg-[#1c2127] transition-colors"
            aria-label={`Sort by: ${sortBy}`}
          >
            <Icon name="arrow-up-down" size={18} />
            <span className="hidden sm:inline">Sort:</span>
            <span className="font-semibold capitalize">{sortBy}</span>
            <Icon name="chevron-down" size={18} />
          </button>
        </div>
      </div>

      {/* Brief grid */}
      {MOCK_BRIEFS.length > 0 ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8"
          role="feed"
          aria-label="AI-generated briefs"
        >
          {MOCK_BRIEFS.map((brief) => (
            <BriefCard
              key={brief.id}
              title={brief.title}
              postCount={brief.postCount}
              platformCount={brief.platformCount}
              recency={brief.recency}
              snippet={brief.snippet}
              tags={brief.tags}
              slug={brief.slug}
              confidence={brief.confidence}
              sourcePlatforms={brief.sourcePlatforms}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          message="No briefs available yet."
          suggestion="Check back soon as new briefs are generated from incoming complaints."
        />
      )}

      {/* Load More */}
      <div className="flex justify-center mt-12 mb-4">
        <button
          type="button"
          className={[
            "inline-flex items-center gap-2",
            "px-8 py-3 rounded-xl",
            "text-sm font-bold",
            "border-2 border-slate-200 dark:border-[#3b4754]",
            "text-slate-700 dark:text-[#9dabb9]",
            "hover:border-[#137fec] hover:text-[#137fec]",
            "transition-all duration-200",
          ].join(" ")}
        >
          Load More Opportunities
          <Icon name="chevron-down" size={20} />
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Loading skeleton
   -------------------------------------------------------------------------- */
function BriefsListingSkeleton() {
  return (
    <div className="flex flex-col" aria-busy="true" aria-label="Loading briefs">
      {/* Header skeleton */}
      <div className="mb-10">
        <Skeleton variant="text" className="h-12 w-60" />
        <Skeleton variant="text" className="mt-3 h-6 w-96" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex items-center gap-2 py-4 mb-8 border-b border-slate-200 dark:border-[#283039]">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="chip" className="w-24 h-9" />
        ))}
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-72" />
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   BriefsListingPage -- Suspense boundary for useSearchParams
   -------------------------------------------------------------------------- */
export function BriefsListingPage() {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-8">
      <Suspense fallback={<BriefsListingSkeleton />}>
        <BriefsListingInner />
      </Suspense>
    </section>
  );
}
