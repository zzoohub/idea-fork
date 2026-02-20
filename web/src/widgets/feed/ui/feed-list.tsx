"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { TagType, FeedSortMode } from "@/shared/types";
import { mockFeedPosts } from "@/shared/mocks/data";
import { TagFilterPills } from "@/features/feed-filter";
import { PostCard } from "@/entities/post";
import { SkeletonCard } from "@/shared/ui/skeleton-card";
import { EmptyState } from "@/shared/ui/empty-state";
import { SearchInput } from "@/shared/ui/search-input";
import { SortDropdown } from "@/shared/ui/sort-dropdown";
import { Search } from "lucide-react";

const SORT_OPTIONS: { value: FeedSortMode; label: string }[] = [
  { value: "trending", label: "Trending" },
  { value: "recent", label: "Recent" },
];

export function FeedList() {
  const [activeTag, setActiveTag] = useState<TagType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<FeedSortMode>("trending");
  const [visibleCount, setVisibleCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleTagChange = useCallback((tag: TagType | null) => {
    setActiveTag(tag);
    setVisibleCount(20);
  }, []);

  const filteredPosts = useMemo(() => {
    let posts = [...mockFeedPosts];

    if (activeTag) {
      posts = posts.filter((p) => p.tag === activeTag);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.excerpt.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q)
      );
    }

    if (sortMode === "recent") {
      posts.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else {
      posts.sort((a, b) => {
        const engA = (a.upvotes || 0) + (a.comments || 0) + (a.helpfulVotes || 0);
        const engB = (b.upvotes || 0) + (b.comments || 0) + (b.helpfulVotes || 0);
        return engB - engA;
      });
    }

    return posts;
  }, [activeTag, searchQuery, sortMode]);

  const posts = useMemo(
    () => filteredPosts.slice(0, visibleCount),
    [filteredPosts, visibleCount]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredPosts.length) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((prev) =>
              Math.min(prev + 20, filteredPosts.length)
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

  return (
    <div>
      {/* Controls: search + sort */}
      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search complaints..."
          className="flex-1"
        />
        <SortDropdown
          options={SORT_OPTIONS}
          value={sortMode}
          onChange={setSortMode}
          className="shrink-0"
        />
      </div>

      {/* Filter chips */}
      <div className="mb-4">
        <TagFilterPills activeTag={activeTag} onTagChange={handleTagChange} />
      </div>

      {/* Feed cards */}
      {posts.length === 0 && !isLoadingMore ? (
        <EmptyState
          icon={Search}
          title="No posts found"
          description="Try a different search term or clear filters."
          actionLabel="Clear filters"
          onAction={() => {
            handleTagChange(null);
            setSearchQuery("");
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onTagClick={(tag) => handleTagChange(tag as TagType)}
            />
          ))}
        </div>
      )}

      {/* Loading skeletons */}
      {isLoadingMore && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonCard key={`skeleton-${i}`} variant="feed" />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}
