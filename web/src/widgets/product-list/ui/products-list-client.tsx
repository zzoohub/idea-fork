"use client";

import { useState, useCallback } from "react";
import type { ProductSortMode } from "@/shared/types";
import { mockProducts } from "@/shared/mocks/data";
import { ProductCard } from "@/entities/product";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";

export function ProductsListClient() {
  const [sortMode, setSortMode] = useState<ProductSortMode>("trending");
  const [products, setProducts] = useState(mockProducts);

  const handleBookmarkToggle = useCallback((productId: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, isBookmarked: !p.isBookmarked } : p
      )
    );
    toast("Bookmark updated");
  }, []);

  const sortedProducts = [...products].sort((a, b) => {
    if (sortMode === "trending") return b.complaintCount - a.complaintCount;
    return new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime();
  });

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Products</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Trending and newly launched products with aggregated user
              complaints
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant={sortMode === "trending" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSortMode("trending")}
              className="min-h-11 sm:min-h-0"
            >
              Trending
            </Button>
            <Button
              variant={sortMode === "new" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSortMode("new")}
              className="min-h-11 sm:min-h-0"
            >
              New
            </Button>
          </div>
        </div>
      </div>

      {/* Product cards */}
      <div className="space-y-3">
        {sortedProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onBookmarkToggle={handleBookmarkToggle}
          />
        ))}
      </div>
    </>
  );
}
