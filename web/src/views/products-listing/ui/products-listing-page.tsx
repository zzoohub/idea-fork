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
  { value: "recent", label: "Recent" },
];

const CATEGORY_TAGS = [
  "SaaS",
  "Mobile",
  "DevTools",
  "E-commerce",
  "Productivity",
  "Finance",
];

// TODO: Replace with API data
const MOCK_PRODUCTS = [
  {
    name: "InvoiceNow",
    slug: "invoicenow",
    category: "SaaS",
    isTrending: true,
    complaintCount: 23,
    topIssue: "Complex setup process",
    tags: ["invoicing", "SaaS", "Finance"],
  },
  {
    name: "DevDocs Pro",
    slug: "devdocs-pro",
    category: "DevTools",
    isTrending: false,
    complaintCount: 41,
    topIssue: "Search is unreliable",
    tags: ["documentation", "DevTools"],
  },
  {
    name: "TaskFlow",
    slug: "taskflow",
    category: "Productivity",
    isTrending: true,
    complaintCount: 17,
    topIssue: "No offline mode",
    tags: ["project management", "Productivity"],
  },
  {
    name: "CodeReview AI",
    slug: "codereview-ai",
    category: "DevTools",
    isTrending: false,
    complaintCount: 35,
    topIssue: "False positives in linting",
    tags: ["code review", "DevTools", "AI"],
  },
  {
    name: "DesignSync",
    slug: "designsync",
    category: "SaaS",
    isTrending: true,
    complaintCount: 12,
    topIssue: "Slow export times",
    tags: ["design", "collaboration", "SaaS"],
  },
  {
    name: "BugTracker Plus",
    slug: "bugtracker-plus",
    category: "DevTools",
    isTrending: false,
    complaintCount: 28,
    topIssue: "Duplicate detection broken",
    tags: ["bug tracking", "DevTools"],
  },
];

/* --------------------------------------------------------------------------
   ProductsListingPage
   -------------------------------------------------------------------------- */
export function ProductsListingPage() {
  const [sortValue, setSortValue] = useState("complaints");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // TODO: Replace with API data
  const filteredProducts = activeCategory
    ? MOCK_PRODUCTS.filter(
        (p) =>
          p.category === activeCategory || p.tags.includes(activeCategory),
      )
    : MOCK_PRODUCTS;

  return (
    <div className="mx-auto w-full max-w-[1120px] px-space-lg py-layout-md">
      {/* Page header */}
      <div className="flex flex-col gap-layout-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display font-bold text-text-primary leading-[var(--leading-display)]">
            Products
          </h1>
          <p className="mt-space-sm text-body text-text-secondary leading-[var(--leading-body)]">
            Trending products paired with user complaints.
          </p>
        </div>
        <SortDropdown
          options={SORT_OPTIONS}
          value={sortValue}
          onChange={setSortValue}
          className="shrink-0"
        />
      </div>

      {/* Category filters */}
      <div className="mt-layout-sm">
        <FilterChipBar
          tags={CATEGORY_TAGS}
          activeTag={activeCategory}
          onTagChange={setActiveCategory}
        />
      </div>

      {/* Product grid */}
      {filteredProducts.length > 0 ? (
        <div className="mt-layout-sm grid grid-cols-1 gap-card-gap lg:grid-cols-2">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.slug}
              name={product.name}
              slug={product.slug}
              category={product.category}
              isTrending={product.isTrending}
              complaintCount={product.complaintCount}
              topIssue={product.topIssue}
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
    <div className="mx-auto w-full max-w-[1120px] px-space-lg py-layout-md">
      {/* Header skeleton */}
      <div className="flex flex-col gap-layout-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-space-sm">
          <div className="skeleton h-[36px] w-[180px] rounded-card" />
          <div className="skeleton h-[20px] w-[320px] rounded-[4px]" />
        </div>
        <div className="skeleton h-[36px] w-[160px] rounded-card" />
      </div>

      {/* Filter skeleton */}
      <div className="mt-layout-sm flex gap-space-sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="skeleton h-[32px] rounded-full"
            style={{ width: `${60 + i * 12}px` }}
          />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="mt-layout-sm grid grid-cols-1 gap-card-gap lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="skeleton rounded-card"
            style={{ height: "160px" }}
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
    <div className="mt-layout-md flex flex-col items-center justify-center py-layout-lg text-center">
      <p className="text-body text-text-secondary">
        No products match this filter.
      </p>
      <p className="mt-space-sm text-body-sm text-text-tertiary max-w-[320px]">
        Try selecting a different category or clear the filter.
      </p>
      <div className="mt-space-lg">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-space-sm rounded-card px-space-lg py-space-sm text-body font-semibold bg-transparent text-interactive hover:bg-bg-tertiary cursor-pointer transition-colors"
          style={{
            transitionDuration: "var(--duration-fast)",
            transitionTimingFunction: "var(--ease-out)",
          }}
        >
          Clear filter
        </button>
      </div>
    </div>
  );
}
