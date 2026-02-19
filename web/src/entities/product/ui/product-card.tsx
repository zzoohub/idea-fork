"use client";

import Link from "next/link";
import { MessageSquareWarning } from "lucide-react";
import type { Product } from "@/shared/types";
import { PlatformIcon } from "@/shared/ui/platform-icon";
import { SentimentBadge } from "@/shared/ui/sentiment-badge";
import { BookmarkButton } from "@/shared/ui/bookmark-button";

interface ProductCardProps {
  product: Product;
  onBookmarkToggle: (productId: string) => void;
}

export function ProductCard({ product, onBookmarkToggle }: ProductCardProps) {
  return (
    <article className="group relative rounded-lg border bg-card p-4 transition-shadow hover:shadow-md">
      <Link
        href={`/products/${product.id}`}
        className="absolute inset-0 z-0"
        aria-label={`View product: ${product.name}`}
      />

      <div className="relative z-10 flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold leading-snug">
            {product.name}
          </h3>
          <SentimentBadge level={product.sentimentLevel} />
        </div>
        <BookmarkButton
          isBookmarked={product.isBookmarked}
          onToggle={() => onBookmarkToggle(product.id)}
        />
      </div>

      <p className="relative z-10 text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3 pointer-events-none">
        {product.description}
      </p>

      <div className="relative z-10 flex items-center gap-4 pointer-events-none">
        <div className="flex items-center gap-1">
          {product.platforms.map((platform) => (
            <PlatformIcon key={platform} platform={platform} size={14} />
          ))}
        </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageSquareWarning size={12} />
          {product.complaintCount} complaints
        </span>
        <span className="ml-auto text-xs text-muted-foreground truncate max-w-[200px]">
          {product.topIssue}
        </span>
      </div>
    </article>
  );
}
