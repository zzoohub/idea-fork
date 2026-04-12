"use client";

import { useEffect, useState } from "react";
import type { ProductPost } from "@/src/shared/api";
import { trackProductViewed, trackProductSignalClicked } from "@/src/shared/analytics";
import { computeThemes, getSeverity } from "./product-detail-utils";

export type SortOption = "recent" | "popular" | "critical";

const INITIAL_VISIBLE_COUNT = 3;

export function useProductSignals(
  product: { id: number; name: string; posts: ProductPost[] },
  getPostTypeLabel: (key: string) => string,
) {
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [activePostType, setActivePostType] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    trackProductViewed({ product_id: product.id, product_name: product.name });
  }, [product.id, product.name]);

  const themes = computeThemes(product.posts, getPostTypeLabel);
  const availablePostTypes = themes.map((th) => th.type);

  const filteredPosts = activePostType
    ? product.posts.filter((p) => p.post_type === activePostType)
    : product.posts;

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === "popular") return b.score - a.score;
    if (sortBy === "critical") return getSeverity(a) - getSeverity(b);
    return new Date(b.external_created_at).getTime() - new Date(a.external_created_at).getTime();
  });

  const visibleSignals = showAll
    ? sortedPosts
    : sortedPosts.slice(0, INITIAL_VISIBLE_COUNT);

  const remainingCount = sortedPosts.length - INITIAL_VISIBLE_COUNT;

  const toggleExpanded = (id: number, post: ProductPost) => {
    if (!expandedIds.has(id)) {
      trackProductSignalClicked({
        product_id: product.id,
        post_id: id,
        platform: post.source,
      });
    }
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePostType = (type: string) => {
    setActivePostType((prev) => (prev === type ? null : type));
  };

  return {
    themes,
    availablePostTypes,
    sortedPosts,
    visibleSignals,
    remainingCount,
    sortBy,
    setSortBy,
    activePostType,
    setActivePostType,
    togglePostType,
    expandedIds,
    toggleExpanded,
    showAll,
    setShowAll,
  };
}
