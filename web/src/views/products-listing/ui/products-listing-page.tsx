"use client";

import { useState } from "react";
import { ProductCard } from "@/src/entities/product/ui";
import { FilterChipBar } from "@/src/features/filter/ui";
import { SortDropdown } from "@/src/shared/ui";

/* --------------------------------------------------------------------------
   Mock Data
   TODO: Replace with API data
   -------------------------------------------------------------------------- */
const SORT_OPTIONS = [
  { value: "complaints", label: "Most Complaints" },
  { value: "trending", label: "Trending" },
  { value: "recent", label: "Recently Launched" },
];

const CATEGORY_TAGS = [
  { label: "SaaS" },
  { label: "Design Tools" },
  { label: "Project Management" },
  { label: "Fintech" },
  { label: "Marketplace" },
  { label: "Entertainment" },
];

const MOCK_PRODUCTS = [
  {
    name: "Notion",
    slug: "notion",
    category: "Productivity",
    trendPercent: 12,
    complaintCount: 156,
    topFrustration:
      "Mobile app performance is sluggish on large pages, taking over 5 seconds to load database views...",
    tags: ["productivity", "note-taking"],
  },
  {
    name: "Linear",
    slug: "linear",
    iconBg: "bg-gradient-to-br from-purple-500 to-indigo-500",
    category: "Project Management",
    trendPercent: 8,
    complaintCount: 42,
    topFrustration:
      "Sync issues between mobile and desktop app when offline mode is engaged...",
    tags: ["project management", "DevTools"],
  },
  {
    name: "Figma",
    slug: "figma",
    category: "Design Tools",
    trendLabel: "Stable" as const,
    complaintCount: 89,
    topFrustration:
      "Memory usage spikes causing browser crashes on complex prototypes with variables...",
    tags: ["design", "collaboration"],
  },
  {
    name: "Stripe",
    slug: "stripe",
    iconBg: "bg-blue-600",
    category: "Fintech",
    trendPercent: 4,
    complaintCount: 12,
    topFrustration:
      "Dashboard reporting lacks granularity for multi-currency transactions...",
    tags: ["payments", "fintech"],
  },
  {
    name: "Airbnb",
    slug: "airbnb",
    iconBg: "bg-pink-500",
    category: "Marketplace",
    trendLabel: "Hot" as const,
    complaintCount: 203,
    topFrustration:
      "Host cancellation policies are unclear and refund process takes too long...",
    tags: ["marketplace", "travel"],
  },
  {
    name: "Spotify",
    slug: "spotify",
    iconBg: "bg-green-600",
    category: "Entertainment",
    trendPercent: 2,
    complaintCount: 18,
    topFrustration:
      "Shuffle algorithm repeats the same 20 songs in a 500 song playlist...",
    tags: ["music", "entertainment"],
  },
];

/* --------------------------------------------------------------------------
   ProductsListingPage
   -------------------------------------------------------------------------- */
export function ProductsListingPage() {
  const [sortValue, setSortValue] = useState("complaints");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredProducts = activeCategory
    ? MOCK_PRODUCTS.filter(
        (p) =>
          p.category === activeCategory || p.tags.includes(activeCategory),
      )
    : MOCK_PRODUCTS;

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
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.slug}
              name={product.name}
              slug={product.slug}
              iconBg={"iconBg" in product ? product.iconBg : undefined}
              category={product.category}
              trendPercent={
                "trendPercent" in product ? product.trendPercent : undefined
              }
              trendLabel={
                "trendLabel" in product ? product.trendLabel : undefined
              }
              complaintCount={product.complaintCount}
              topFrustration={product.topFrustration}
              tags={product.tags}
            />
          ))}
        </div>
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
