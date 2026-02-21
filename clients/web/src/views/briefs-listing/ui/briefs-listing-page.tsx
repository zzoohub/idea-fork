"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import { Skeleton, EmptyState, Icon, ErrorState } from "@/src/shared/ui";
import { BriefCard } from "@/src/entities/brief/ui";
import { fetchBriefs } from "@/src/entities/brief/api";
import type { BriefListItem } from "@/src/shared/api";
import { formatRelativeTime } from "@/src/shared/lib/format-relative-time";

/* --------------------------------------------------------------------------
   Sort field mapping (UI label → API sort param)
   -------------------------------------------------------------------------- */
const SORT_MAP: Record<string, string> = {
  trending: "-upvote_count",
  newest: "-published_at",
  sources: "-source_count",
};

/* --------------------------------------------------------------------------
   BriefsListingInner -- client component
   -------------------------------------------------------------------------- */
function BriefsListingInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sortBy = searchParams.get("sort") ?? "trending";

  /* State */
  const [briefs, setBriefs] = useState<BriefListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

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

  /* Fetch briefs */
  useEffect(() => {
    let cancelled = false;

    fetchBriefs({ sort: SORT_MAP[sortBy] ?? SORT_MAP["trending"] })
      .then((res) => {
        if (!cancelled) {
          setBriefs(res.data);
          setHasNext(res.meta?.has_next ?? false);
          setNextCursor(res.meta?.next_cursor ?? null);
          setLoading(false);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load briefs.");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [sortBy]);

  /* Load more */
  const handleLoadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);

    fetchBriefs({
      sort: SORT_MAP[sortBy] ?? SORT_MAP["trending"],
      cursor: nextCursor,
    })
      .then((res) => {
        setBriefs((prev) => [...prev, ...res.data]);
        setHasNext(res.meta?.has_next ?? false);
        setNextCursor(res.meta?.next_cursor ?? null);
        setLoadingMore(false);
      })
      .catch(() => {
        setLoadingMore(false);
      });
  }, [nextCursor, loadingMore, sortBy]);

  if (loading) return <BriefsListingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

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
        <div className="flex items-center justify-end gap-4">
          {/* Sort dropdown */}
          <button
            type="button"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-[#9dabb9] hover:bg-slate-100 dark:hover:bg-[#1c2127] transition-colors"
            aria-label={`Sort by: ${sortBy}`}
            onClick={() => {
              const keys = Object.keys(SORT_MAP);
              const idx = keys.indexOf(sortBy);
              const next = keys[(idx + 1) % keys.length];
              handleSortChange(next);
            }}
          >
            <Icon name="arrow-up-down" size={18} />
            <span className="hidden sm:inline">Sort:</span>
            <span className="font-semibold capitalize">{sortBy}</span>
            <Icon name="chevron-down" size={18} />
          </button>
        </div>
      </div>

      {/* Brief grid */}
      {briefs.length > 0 ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8"
          role="feed"
          aria-label="AI-generated briefs"
        >
          {briefs.map((brief) => (
            <BriefCard
              key={brief.id}
              title={brief.title}
              postCount={brief.source_count}
              platformCount={1}
              recency={brief.published_at ? formatRelativeTime(brief.published_at) : ""}
              snippet={brief.summary}
              tags={Object.keys(brief.demand_signals).slice(0, 3)}
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

      {/* Load More */}
      {hasNext && (
        <div className="flex justify-center mt-12 mb-4">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className={[
              "inline-flex items-center gap-2",
              "px-8 py-3 rounded-xl",
              "text-sm font-bold",
              "border-2 border-slate-200 dark:border-[#3b4754]",
              "text-slate-700 dark:text-[#9dabb9]",
              "hover:border-[#137fec] hover:text-[#137fec]",
              "transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            {loadingMore ? "Loading..." : "Load More Opportunities"}
            {!loadingMore && <Icon name="chevron-down" size={20} />}
          </button>
        </div>
      )}
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
