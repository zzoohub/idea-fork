"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useInfiniteScroll } from "@/src/shared/lib/use-infinite-scroll";
import { ProductCard } from "@/src/entities/product/ui";
import { FilterChipBar } from "@/src/features/filter/ui";
import { SortDropdown, ErrorState } from "@/src/shared/ui";
import { fetchProducts } from "@/src/entities/product/api";
import { fetchProductTags } from "@/src/entities/tag/api";
import { computeHeatLevel } from "@/src/shared/lib/compute-heat-level";
import type { ProductListItem } from "@/src/shared/api";

/* --------------------------------------------------------------------------
   Sort options
   -------------------------------------------------------------------------- */
const SORT_OPTIONS_KEYS = [
  { value: "-complaint_count", labelKey: "mostSignals" },
  { value: "-trending_score", labelKey: "trending" },
  { value: "-launched_at", labelKey: "newest" },
] as const;

/* --------------------------------------------------------------------------
   Period filter options
   -------------------------------------------------------------------------- */
const PERIOD_OPTIONS = [
  { value: "", labelKey: "all" },
  { value: "7d", labelKey: "7d" },
  { value: "30d", labelKey: "30d" },
  { value: "90d", labelKey: "90d" },
] as const;

/* --------------------------------------------------------------------------
   ProductsListingPage
   -------------------------------------------------------------------------- */
export function ProductsListingPage() {
  const t = useTranslations("products");
  const tCommon = useTranslations("common");

  const [sortValue, setSortValue] = useState("-complaint_count");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState("");

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categoryTags, setCategoryTags] = useState<{ label: string; value: string }[]>([]);

  const sortOptions = SORT_OPTIONS_KEYS.map((opt) => ({
    label: t(`sortOptions.${opt.labelKey}`),
    value: opt.value,
  }));

  /* Fetch category tags ordered by product count */
  useEffect(() => {
    fetchProductTags()
      .then((res) => {
        setCategoryTags(res.data.map((tag) => ({ label: tag.name, value: tag.name })));
      })
      .catch(() => {
        /* ignore — chips just won't show */
      });
  }, []);

  /* Fetch products */
  useEffect(() => {
    let cancelled = false;

    fetchProducts({
      category: activeCategory ?? undefined,
      sort: sortValue,
      period: activePeriod || undefined,
    })
      .then((res) => {
        if (!cancelled) {
          setProducts(res.data);
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
  }, [sortValue, activeCategory, activePeriod, t]);

  /* Load more */
  const handleLoadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);

    fetchProducts({
      category: activeCategory ?? undefined,
      sort: sortValue,
      cursor: nextCursor,
      period: activePeriod || undefined,
    })
      .then((res) => {
        setProducts((prev) => [...prev, ...res.data]);
        setHasNext(res.meta?.has_next ?? false);
        setNextCursor(res.meta?.next_cursor ?? null);
        setLoadingMore(false);
      })
      .catch(() => {
        setLoadingMore(false);
      });
  }, [nextCursor, loadingMore, sortValue, activeCategory, activePeriod]);

  const sentinelRef = useInfiniteScroll(handleLoadMore, {
    enabled: hasNext && !loadingMore,
  });

  if (loading) return <ProductsListingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 md:px-10 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          {t("heading")}
        </h1>
        <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
          {t("description")}
        </p>
      </div>

      {/* Filters + Sort row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <FilterChipBar
            tags={categoryTags}
            activeTag={activeCategory}
            onTagChange={setActiveCategory}
          />
          <div className="flex items-center gap-1.5">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={[
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150 cursor-pointer",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#137fec]",
                  activePeriod === opt.value
                    ? "bg-[#137fec] text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700",
                ].join(" ")}
                onClick={() => setActivePeriod(opt.value)}
              >
                {t(`periods.${opt.labelKey}`)}
              </button>
            ))}
          </div>
        </div>
        <SortDropdown
          options={sortOptions}
          value={sortValue}
          onChange={setSortValue}
          className="shrink-0"
        />
      </div>

      {/* Product grid */}
      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.slug}
                name={product.name}
                slug={product.slug}
                iconUrl={product.image_url ?? undefined}
                productUrl={product.url ?? undefined}
                category={product.category ?? tCommon("uncategorized")}
                heatLevel={computeHeatLevel({
                  postCount: product.complaint_count,
                  newestPostAt: product.launched_at,
                })}
                signalCount={product.complaint_count}
                tagline={product.tagline ?? product.description ?? ""}
                source={product.source ?? undefined}
                sources={product.sources}
                tags={product.tags ?? []}
              />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          {hasNext && (
            <div ref={sentinelRef} className="flex justify-center mt-10 py-4">
              {loadingMore && (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-[#137fec]" />
              )}
            </div>
          )}
        </>
      ) : (
        <ProductsEmptyState onReset={() => setActiveCategory(null)} />
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Loading Skeleton
   -------------------------------------------------------------------------- */
export function ProductsListingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 md:px-10 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="skeleton h-10 w-48 rounded-lg" />
        <div className="skeleton mt-2 h-5 w-80 rounded" />
      </div>

      {/* Filter + sort skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="skeleton h-9 rounded-full"
              style={{ width: `${60 + i * 12}px` }}
            />
          ))}
        </div>
        <div className="skeleton h-9 w-40 rounded-lg" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="skeleton rounded-xl"
            style={{ height: "280px" }}
          />
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Empty State (no results for active filter)
   -------------------------------------------------------------------------- */
function ProductsEmptyState({ onReset }: { onReset: () => void }) {
  const t = useTranslations("products");
  const tCommon = useTranslations("common");

  return (
    <div className="mt-16 flex flex-col items-center justify-center py-12 text-center">
      <p className="text-base text-slate-500 dark:text-slate-400">
        {t("empty.message")}
      </p>
      <p className="mt-2 text-sm text-slate-400 dark:text-slate-500 max-w-xs">
        {t("empty.suggestion")}
      </p>
      <div className="mt-6">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-transparent text-primary hover:bg-slate-100 dark:hover:bg-[#232b36] cursor-pointer transition-colors duration-150"
        >
          {tCommon("clearFilter")}
        </button>
      </div>
    </div>
  );
}
