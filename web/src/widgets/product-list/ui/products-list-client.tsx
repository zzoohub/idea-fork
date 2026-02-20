"use client";

import { useState, useMemo } from "react";
import type { ProductSortMode } from "@/shared/types";
import { mockProducts } from "@/shared/mocks/data";
import { ProductCard } from "@/entities/product";
import { SortDropdown } from "@/shared/ui/sort-dropdown";
import { Chip } from "@/shared/ui/chip";

const SORT_OPTIONS: { value: ProductSortMode; label: string }[] = [
  { value: "complaints", label: "Most Complaints" },
  { value: "trending", label: "Trending" },
  { value: "recent", label: "Recent" },
];

export function ProductsListClient() {
  const [sortMode, setSortMode] = useState<ProductSortMode>("complaints");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(mockProducts.map((p) => p.category))],
    []
  );

  const sortedProducts = useMemo(() => {
    let products = [...mockProducts];

    if (activeCategory) {
      products = products.filter((p) => p.category === activeCategory);
    }

    if (sortMode === "complaints") {
      products.sort((a, b) => b.complaintCount - a.complaintCount);
    } else if (sortMode === "trending") {
      products.sort((a, b) => {
        if (a.trendingIndicator && !b.trendingIndicator) return -1;
        if (!a.trendingIndicator && b.trendingIndicator) return 1;
        return b.complaintCount - a.complaintCount;
      });
    }

    return products;
  }, [sortMode, activeCategory]);

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Products</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Trending products paired with user complaints.
            </p>
          </div>
          <SortDropdown
            options={SORT_OPTIONS}
            value={sortMode}
            onChange={setSortMode}
            className="shrink-0"
          />
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
        <Chip
          label="All"
          active={activeCategory === null}
          onClick={() => setActiveCategory(null)}
        />
        {categories.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            active={activeCategory === cat}
            onClick={() =>
              setActiveCategory(activeCategory === cat ? null : cat)
            }
          />
        ))}
      </div>

      {/* Product cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}
