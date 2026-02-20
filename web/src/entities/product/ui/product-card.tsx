"use client";

import Link from "next/link";
import { TrendingUp, MessageSquareWarning } from "lucide-react";
import type { Product } from "@/shared/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const initial = product.name[0]?.toUpperCase() ?? "?";

  return (
    <article className="group relative rounded-lg border bg-card p-4 transition-shadow hover:shadow-md">
      <Link
        href={`/products/${product.id}`}
        className="absolute inset-0 z-0"
        aria-label={`View product: ${product.name}`}
      />

      {/* Header: icon + name */}
      <div className="relative z-10 flex items-center gap-3 mb-2 pointer-events-none">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-sm font-bold shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug truncate">
            {product.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{product.category}</span>
            {product.trendingIndicator && (
              <span className="inline-flex items-center gap-0.5 text-primary">
                <TrendingUp size={12} aria-hidden="true" />
                Trending
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Complaint count + top issue */}
      <div className="relative z-10 flex items-center gap-2 text-sm text-muted-foreground mb-3 pointer-events-none">
        <MessageSquareWarning size={14} className="shrink-0" aria-hidden="true" />
        <span>{product.complaintCount} complaints</span>
        <span aria-hidden="true">·</span>
        <span className="truncate">Top: &ldquo;{product.topIssue}&rdquo;</span>
      </div>

      {/* Tags */}
      <div className="relative z-10 flex flex-wrap gap-1 pointer-events-none">
        {product.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}
