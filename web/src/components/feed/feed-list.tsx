"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { TagType, FeedPost } from "@/types";
import { mockFeedPosts } from "@/lib/mock-data";
import { TagFilterPills } from "./tag-filter-pills";
import { TrendingPanel } from "./trending-panel";
import { CycleIndicator } from "./cycle-indicator";
import { FeedCard } from "./feed-card";
import { SkeletonCard } from "@/components/skeleton-card";
import { EmptyState } from "@/components/empty-state";
import { Search, X } from "lucide-react";
import { toast } from "sonner";

export function FeedList() {
  const [activeTag, setActiveTag] = useState<TagType | null>(null);
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Filter posts
  const filteredPosts = mockFeedPosts.filter((post) => {
    if (activeTag && post.tag !== activeTag) return false;
    if (
      activeKeyword &&
      !post.excerpt.toLowerCase().includes(activeKeyword.toLowerCase()) &&
      !post.title.toLowerCase().includes(activeKeyword.toLowerCase())
    )
      return false;
    return true;
  });

  // Initialize and update displayed posts
  useEffect(() => {
    setPosts(filteredPosts.slice(0, visibleCount));
  }, [activeTag, activeKeyword, visibleCount]);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredPosts.length) {
          setIsLoadingMore(true);
          // Simulate network delay
          setTimeout(() => {
            setVisibleCount((prev) =>
              Math.min(prev + 10, filteredPosts.length)
            );
            setIsLoadingMore(false);
          }, 500);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, filteredPosts.length]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(10);
  }, [activeTag, activeKeyword]);

  const handleBookmarkToggle = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p
      )
    );
    const post = mockFeedPosts.find((p) => p.id === postId);
    if (post) {
      toast(post.isBookmarked ? "Removed from bookmarks" : "Saved to bookmarks");
    }
  }, []);

  return (
    <div className="flex gap-8">
      {/* Feed column */}
      <div className="flex-1 min-w-0 max-w-[720px]">
        <div className="mb-4">
          <CycleIndicator />
        </div>

        {/* Keyword filter banner */}
        {activeKeyword && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
            <Search size={14} className="text-muted-foreground" />
            <span>
              Showing results for: <strong>#{activeKeyword}</strong>
            </span>
            <button
              type="button"
              onClick={() => setActiveKeyword(null)}
              className="ml-auto rounded-md p-1 hover:bg-accent min-h-[28px] min-w-[28px] flex items-center justify-center"
              aria-label="Clear keyword filter"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="mb-4">
          <TagFilterPills activeTag={activeTag} onTagChange={setActiveTag} />
        </div>

        {/* Feed cards */}
        {posts.length === 0 && !isLoadingMore ? (
          <EmptyState
            icon={Search}
            title="No posts match this filter"
            description="Try removing filters or check back after the next update."
            actionLabel="Clear filters"
            onAction={() => {
              setActiveTag(null);
              setActiveKeyword(null);
            }}
          />
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <FeedCard
                key={post.id}
                post={post}
                onBookmarkToggle={handleBookmarkToggle}
              />
            ))}
          </div>
        )}

        {/* Loading skeletons */}
        {isLoadingMore && (
          <div className="space-y-3 mt-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={`skeleton-${i}`} variant="feed" />
            ))}
          </div>
        )}

        {/* Intersection observer sentinel */}
        <div ref={sentinelRef} className="h-1" />
      </div>

      {/* Trending panel — desktop only */}
      <div className="hidden lg:block w-64 shrink-0">
        <TrendingPanel
          activeKeyword={activeKeyword}
          onKeywordClick={setActiveKeyword}
        />
      </div>
    </div>
  );
}
