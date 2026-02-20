"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, Suspense } from "react";
import {
  SortDropdown,
  Skeleton,
  EmptyState,
  // ErrorState — uncomment when wiring real API
} from "@/src/shared/ui";
import { BriefCard } from "@/src/entities/brief/ui";

/* --------------------------------------------------------------------------
   Mock Data
   TODO: Replace with API data
   -------------------------------------------------------------------------- */
const MOCK_BRIEFS: Array<{
  id: string;
  title: string;
  postCount: number;
  platformCount: number;
  recency: string;
  snippet: string;
  tags: string[];
  slug: string;
}> = [
  {
    id: "1",
    title: "Simple Invoicing for Freelancers",
    postCount: 47,
    platformCount: 3,
    recency: "Active last 30 days",
    snippet:
      "Freelancers consistently complain that existing invoicing tools are bloated with features they don't need. There's strong demand for a minimal, fast invoicing solution focused on solo workers.",
    tags: ["SaaS", "Fintech", "freelancer"],
    slug: "simple-invoicing-freelancers",
  },
  {
    id: "2",
    title: "Affordable Error Monitoring for Indie Devs",
    postCount: 89,
    platformCount: 2,
    recency: "Active last 7 days",
    snippet:
      "Developers on small teams are frustrated with the pricing of existing error monitoring services. Multiple threads discuss the gap between free-tier limitations and enterprise pricing.",
    tags: ["DevTools", "SaaS", "monitoring"],
    slug: "affordable-error-monitoring",
  },
  {
    id: "3",
    title: "Offline-First Learning Apps",
    postCount: 34,
    platformCount: 2,
    recency: "Active last 14 days",
    snippet:
      "Students and commuters repeatedly request offline access for educational apps. App store reviews show a clear pattern of complaints about connectivity requirements for study tools.",
    tags: ["Education", "Mobile", "offline"],
    slug: "offline-first-learning",
  },
  {
    id: "4",
    title: "Simple Project Management for Non-Technical Teams",
    postCount: 62,
    platformCount: 3,
    recency: "Active last 30 days",
    snippet:
      "Teams with non-technical members express frustration with the complexity of existing PM tools. There is a clear desire for stripped-down shared task lists without Gantt charts or resource allocation.",
    tags: ["Productivity", "SaaS"],
    slug: "simple-pm-non-technical",
  },
];

const SORT_OPTIONS = [
  { value: "evidence", label: "Most Evidence" },
  { value: "recent", label: "Recent" },
  { value: "trending", label: "Trending" },
];

/* --------------------------------------------------------------------------
   BriefsListingPage — Inner component
   -------------------------------------------------------------------------- */
function BriefsListingInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sortBy = searchParams.get("sort") ?? "evidence";

  const handleSortChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "evidence") {
        params.delete("sort");
      } else {
        params.set("sort", value);
      }
      const qs = params.toString();
      router.push(qs ? `/briefs?${qs}` : "/briefs", { scroll: false });
    },
    [searchParams, router],
  );

  // Uncomment to preview error state:
  // return <ErrorState message="Failed to load briefs." onRetry={() => {}} />;

  return (
    <div className="flex flex-col gap-layout-sm">
      {/* ---- Header + Sort ---- */}
      <div className="flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-space-xs">
          <h1 className="text-h1 font-bold text-text-primary leading-[var(--leading-h1)]">
            AI Briefs
          </h1>
          <p className="text-body-sm text-text-secondary leading-[var(--leading-body-sm)]">
            Synthesized product opportunities from real user complaints.
          </p>
        </div>
        <SortDropdown
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={handleSortChange}
          className="self-start sm:self-center"
        />
      </div>

      {/* ---- Brief grid ---- */}
      {MOCK_BRIEFS.length > 0 ? (
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-card-gap"
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
            />
          ))}
        </div>
      ) : (
        <EmptyState
          message="No briefs available yet."
          suggestion="Check back soon as new briefs are generated from incoming complaints."
        />
      )}

      {/* Uncomment to preview loading state: */}
      {/* <BriefsListingSkeleton /> */}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Loading skeleton
   -------------------------------------------------------------------------- */
function BriefsListingSkeleton() {
  return (
    <div className="flex flex-col gap-layout-sm" aria-busy="true" aria-label="Loading briefs">
      {/* Header skeleton */}
      <div className="flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-space-xs">
          <Skeleton variant="text" className="h-[28px] w-[140px]" />
          <Skeleton variant="text" className="h-[16px] w-[320px]" />
        </div>
        <Skeleton variant="chip" className="w-[140px]" />
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-card-gap">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   BriefsListingPage — Suspense boundary for useSearchParams
   -------------------------------------------------------------------------- */
export function BriefsListingPage() {
  return (
    <section
      className="mx-auto w-full max-w-[1200px] px-layout-xs py-layout-sm"
    >
      {/* Visible h1 rendered by BriefsListingInner */}
      <Suspense fallback={<BriefsListingSkeleton />}>
        <BriefsListingInner />
      </Suspense>
    </section>
  );
}
