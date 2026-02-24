"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/shared/i18n/navigation";
import { useInfiniteScroll } from "@/src/shared/lib/use-infinite-scroll";
import { Skeleton, EmptyState, ErrorState, SortDropdown } from "@/src/shared/ui";
import { useScrollReveal } from "@/src/shared/lib/gsap";
import { BriefCard } from "@/src/entities/brief/ui";
import { fetchBriefs } from "@/src/entities/brief/api";
import type { BriefListItem } from "@/src/shared/api";
import { extractDemandSignals } from "@/src/shared/lib/extract-demand-signals";
import { computeHeatLevel } from "@/src/shared/lib/compute-heat-level";
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
  const t = useTranslations("briefs");

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
          setError(t("errors.loadFailed"));
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [sortBy, t]);

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

  const sentinelRef = useInfiniteScroll(handleLoadMore, {
    enabled: hasNext && !loadingMore,
  });

  const gridRef = useScrollReveal();

  if (loading) return <BriefsListingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const sortOptions = (["trending", "newest", "sources"] as const).map((key) => ({
    label: t(`sortOptions.${key}`),
    value: key,
  }));

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
          {t("heading")}
        </h1>
        <p className="mt-3 text-lg text-slate-600 dark:text-[#9dabb9] font-light max-w-2xl">
          {t("description")}
        </p>
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-14 z-40 -mx-6 px-6 py-4 border-b border-slate-200 dark:border-[#283039] backdrop-blur-xl bg-white/80 dark:bg-[#101922]/80">
        <div className="flex items-center justify-end gap-4">
          {/* Sort dropdown */}
          <SortDropdown
            options={sortOptions}
            value={sortBy}
            onChange={handleSortChange}
          />
        </div>
      </div>

      {/* Brief grid */}
      {briefs.length > 0 ? (
        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8"
          role="feed"
          aria-label="AI-generated briefs"
        >
          {briefs.map((brief) => {
            const parsed = extractDemandSignals(brief.demand_signals);
            const heatLevel = computeHeatLevel({
              postCount: parsed.postCount,
              newestPostAt: parsed.newestPostAt,
            });
            const freshness = parsed.newestPostAt
              ? formatRelativeTime(parsed.newestPostAt)
              : null;

            return (
              <BriefCard
                key={brief.id}
                title={brief.title}
                heatLevel={heatLevel}
                complaintCount={parsed.postCount || brief.source_count}
                communityCount={parsed.subredditCount || 1}
                freshness={freshness}
                snippet={brief.summary}
                tags={[]}
                slug={brief.slug}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          message={t("empty.message")}
          suggestion={t("empty.suggestion")}
        />
      )}

      {/* Infinite scroll sentinel */}
      {hasNext && (
        <div ref={sentinelRef} className="flex justify-center mt-12 mb-4 py-4">
          {loadingMore && (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-[#137fec]" />
          )}
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
