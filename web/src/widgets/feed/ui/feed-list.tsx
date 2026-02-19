"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { TagType } from "@/shared/types";
import { mockFeedPosts } from "@/shared/mocks/data";
import { TagFilterPills } from "@/features/feed-filter";
import { TrendingPanel } from "@/widgets/trending-panel";
import { CycleIndicator } from "@/entities/cycle";
import { PostCard } from "@/entities/post";
import { SkeletonCard } from "@/shared/ui/skeleton-card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Search, X } from "lucide-react";
import { toast } from "sonner";

export function FeedList() {
  const [activeTag, setActiveTag] = useState<TagType | null>(null);
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(
    () => new Set(mockFeedPosts.filter((p) => p.isBookmarked).map((p) => p.id))
  );
  const [visibleCount, setVisibleCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleTagChange = useCallback((tag: TagType | null) => {
    setActiveTag(tag);
    setVisibleCount(10);
  }, []);

  const handleKeywordChange = useCallback((keyword: string | null) => {
    setActiveKeyword(keyword);
    setVisibleCount(10);
  }, []);

  // Filter and slice posts as derived state
  const filteredPosts = useMemo(() => {
    return mockFeedPosts
      .map((post) => ({
        ...post,
        isBookmarked: bookmarkedIds.has(post.id),
      }))
      .filter((post) => {
        if (activeTag && post.tag !== activeTag) return false;
        if (
          activeKeyword &&
          !post.excerpt.toLowerCase().includes(activeKeyword.toLowerCase()) &&
          !post.title.toLowerCase().includes(activeKeyword.toLowerCase())
        )
          return false;
        return true;
      });
  }, [activeTag, activeKeyword, bookmarkedIds]);

  const posts = useMemo(
    () => filteredPosts.slice(0, visibleCount),
    [filteredPosts, visibleCount]
  );

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

  const handleBookmarkToggle = useCallback((postId: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      const wasBookmarked = next.has(postId);
      if (wasBookmarked) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      toast(wasBookmarked ? "Removed from bookmarks" : "Saved to bookmarks");
      return next;
    });
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
              onClick={() => handleKeywordChange(null)}
              className="ml-auto rounded-md p-1 hover:bg-accent min-h-[28px] min-w-[28px] flex items-center justify-center"
              aria-label="Clear keyword filter"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="mb-4">
          <TagFilterPills activeTag={activeTag} onTagChange={handleTagChange} />
        </div>

        {/* Feed cards */}
        {posts.length === 0 && !isLoadingMore ? (
          <EmptyState
            icon={Search}
            title="No posts match this filter"
            description="Try removing filters or check back after the next update."
            actionLabel="Clear filters"
            onAction={() => {
              handleTagChange(null);
              handleKeywordChange(null);
            }}
          />
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
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
          onKeywordClick={handleKeywordChange}
        />
      </div>
    </div>
  );
}
