"use client";

import { useEffect, useState, useCallback } from "react";
import { ProductCard } from "@/src/entities/product/ui";
import { FilterChipBar } from "@/src/features/filter/ui";
import { SortDropdown, ErrorState } from "@/src/shared/ui";
import { fetchProducts } from "@/src/entities/product/api";
import type { ProductListItem } from "@/src/shared/api";

/* --------------------------------------------------------------------------
   Sort options
   -------------------------------------------------------------------------- */
const SORT_OPTIONS = [
  { value: "-complaint_count", label: "Most Complaints" },
  { value: "-trending_score", label: "Trending" },
];

const CATEGORY_TAGS = [
  { label: "SaaS" },
  { label: "Design Tools" },
  { label: "Project Management" },
  { label: "Fintech" },
  { label: "Marketplace" },
  { label: "Entertainment" },
];

/* --------------------------------------------------------------------------
   ProductsListingPage
   -------------------------------------------------------------------------- */
export function ProductsListingPage() {
  const [sortValue, setSortValue] = useState("-complaint_count");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  /* Fetch products */
  useEffect(() => {
    let cancelled = false;

    fetchProducts({
      category: activeCategory ?? undefined,
      sort: sortValue,
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
          setError("Failed to load products.");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [sortValue, activeCategory]);

  /* Load more */
  const handleLoadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);

    fetchProducts({
      category: activeCategory ?? undefined,
      sort: sortValue,
      cursor: nextCursor,
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
  }, [nextCursor, loadingMore, sortValue, activeCategory]);

  if (loading) return <ProductsListingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 md:px-10 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Products
        </h1>
        <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
          Discover trending products and their top user frustrations.
        </p>
      </div>

      {/* Filters + Sort row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <FilterChipBar
          tags={CATEGORY_TAGS}
          activeTag={activeCategory}
          onTagChange={setActiveCategory}
        />
        <SortDropdown
          options={SORT_OPTIONS}
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
                category={product.category ?? "Uncategorized"}
                trendPercent={Math.round(product.trending_score)}
                complaintCount={product.complaint_count}
                topFrustration={product.description ?? ""}
                tags={product.category ? [product.category.toLowerCase()] : []}
              />
            ))}
          </div>

          {/* Load More */}
          {hasNext && (
            <div className="flex justify-center mt-10">
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
                {loadingMore ? "Loading..." : "Load More"}
              </button>
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
  return (
    <div className="mt-16 flex flex-col items-center justify-center py-12 text-center">
      <p className="text-base text-slate-500 dark:text-slate-400">
        No products match this filter.
      </p>
      <p className="mt-2 text-sm text-slate-400 dark:text-slate-500 max-w-xs">
        Try selecting a different category or clear the filter.
      </p>
      <div className="mt-6">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-transparent text-primary hover:bg-slate-100 dark:hover:bg-[#232b36] cursor-pointer transition-colors duration-150"
        >
          Clear filter
        </button>
      </div>
    </div>
  );
}
