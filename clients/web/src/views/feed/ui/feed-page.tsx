"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import { Skeleton, EmptyState, ErrorState } from "@/src/shared/ui";
import { FilterChipBar } from "@/src/features/filter/ui";
import { PostCard } from "@/src/entities/post/ui";
import { fetchPosts } from "@/src/entities/post/api";
import { fetchTags } from "@/src/entities/tag/api";
import type { Post, Tag } from "@/src/shared/api";
import { formatRelativeTime } from "@/src/shared/lib/format-relative-time";

/* --------------------------------------------------------------------------
   Post type tabs
   -------------------------------------------------------------------------- */
const POST_TYPE_TABS = [
  { key: null, label: "All" },
  { key: "need", label: "Need" },
  { key: "complaint", label: "Complaint" },
  { key: "feature_request", label: "Feature Request" },
  { key: "alternative_seeking", label: "Alternative" },
  { key: "comparison", label: "Comparison" },
  { key: "question", label: "Question" },
  { key: "review", label: "Review" },
] as const;

const VALID_POST_TYPES = new Set(
  POST_TYPE_TABS.map((t) => t.key).filter(Boolean),
);

/* --------------------------------------------------------------------------
   Map API source string to PostCard source type
   -------------------------------------------------------------------------- */
function mapSource(source: string) {
  const s = source.toLowerCase();
  if (s === "reddit") return "reddit" as const;
  if (s === "twitter" || s === "x") return "twitter" as const;
  if (s === "linkedin") return "linkedin" as const;
  if (s === "appstore" || s === "app_store") return "appstore" as const;
  return "reddit" as const;
}

function mapSourceName(post: Post): string {
  if (post.subreddit) return `r/${post.subreddit}`;
  const s = post.source.toLowerCase();
  if (s === "twitter" || s === "x") return "Twitter / X";
  if (s === "linkedin") return "LinkedIn";
  if (s === "appstore" || s === "app_store") return "App Store";
  return post.source;
}

/* --------------------------------------------------------------------------
   Map API sort param to backend sort field
   -------------------------------------------------------------------------- */
const SORT_MAP: Record<string, string> = {
  recent: "-external_created_at",
  score: "-score",
  comments: "-num_comments",
};

/* --------------------------------------------------------------------------
   FeedPageInner - reads search params
   -------------------------------------------------------------------------- */

function FeedPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTag = searchParams.get("tag");
  const rawPostType = searchParams.get("post_type");
  const activePostType = VALID_POST_TYPES.has(rawPostType) ? rawPostType : null;

  /* State */
  const [posts, setPosts] = useState<Post[]>([]);
  const [tags, setTags] = useState<Array<{ label: string; value: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  /* URL param helpers */
  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.push(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [searchParams, router],
  );

  const handleTagChange = useCallback(
    (tag: string | null) => updateParam("tag", tag),
    [updateParam],
  );

  const handlePostTypeChange = useCallback(
    (postType: string | null) => updateParam("post_type", postType),
    [updateParam],
  );

  const handleTagClick = useCallback(
    (tag: string) => updateParam("tag", tag === activeTag ? null : tag),
    [updateParam, activeTag],
  );

  /* Fetch tags on mount */
  useEffect(() => {
    let cancelled = false;
    fetchTags()
      .then((res) => {
        if (!cancelled) {
          setTags(res.data.map((t: Tag) => ({ label: t.name, value: t.slug })));
        }
      })
      .catch(() => {
        // Tags are non-critical; use empty array
      });
    return () => { cancelled = true; };
  }, []);

  /* Fetch posts on mount and when filters change */
  useEffect(() => {
    let cancelled = false;

    fetchPosts({
      tag: activeTag ?? undefined,
      post_type: activePostType ?? undefined,
      sort: SORT_MAP["recent"],
    })
      .then((res) => {
        if (!cancelled) {
          setPosts(res.data);
          setHasNext(res.meta?.has_next ?? false);
          setNextCursor(res.meta?.next_cursor ?? null);
          setLoading(false);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load posts.");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [activeTag, activePostType]);

  /* Load more */
  const handleLoadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);

    fetchPosts({
      tag: activeTag ?? undefined,
      post_type: activePostType ?? undefined,
      sort: SORT_MAP["recent"],
      cursor: nextCursor,
    })
      .then((res) => {
        setPosts((prev) => [...prev, ...res.data]);
        setHasNext(res.meta?.has_next ?? false);
        setNextCursor(res.meta?.next_cursor ?? null);
        setLoadingMore(false);
      })
      .catch(() => {
        setLoadingMore(false);
      });
  }, [nextCursor, loadingMore, activeTag, activePostType]);

  if (loading) return <FeedSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="flex flex-col gap-5 w-full max-w-3xl mx-auto pb-10">
      {/* Post type tabs */}
      <div
        className="flex items-center overflow-x-auto border-b border-slate-200 dark:border-[#283039] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Filter by post type"
      >
        {POST_TYPE_TABS.map((tab) => {
          const isActive = activePostType === tab.key;
          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handlePostTypeChange(tab.key)}
              className={[
                "relative shrink-0 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#137fec]",
                isActive
                  ? "text-[#137fec]"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
              ].join(" ")}
            >
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#137fec] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tag filter */}
      <FilterChipBar
        tags={tags}
        activeTag={activeTag}
        onTagChange={handleTagChange}
      />

      {/* Feed cards */}
      {posts.length > 0 ? (
        <div
          className="flex flex-col gap-5"
          role="feed"
          aria-label="User complaints feed"
        >
          {posts.map((post) => (
            <PostCard
              key={post.id}
              source={mapSource(post.source)}
              sourceName={mapSourceName(post)}
              date={formatRelativeTime(post.external_created_at)}
              title={post.title}
              snippet={post.body ?? ""}
              postType={post.post_type ?? undefined}
              tags={post.tags.map((t) => ({ label: t.name, value: t.slug }))}
              upvotes={post.score}
              commentCount={post.num_comments}
              originalUrl={post.external_url}
              onTagClick={handleTagClick}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          message="No posts match your filters."
          suggestion="Try removing a filter or searching for something else."
          action={{
            label: "Clear filters",
            onClick: () => {
              router.push("/", { scroll: false });
            },
          }}
        />
      )}

      {/* Load More button */}
      {hasNext && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={loadingMore}
          className={[
            "mx-auto px-6 py-2.5",
            "rounded-lg border border-slate-200 dark:border-[#283039]",
            "bg-white dark:bg-[#1b2531]",
            "text-sm font-semibold text-slate-700 dark:text-slate-300",
            "hover:bg-slate-50 dark:hover:bg-[#232b36]",
            "hover:border-[#137fec]/50",
            "transition-colors duration-200",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#137fec]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          {loadingMore ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Loading skeleton
   -------------------------------------------------------------------------- */

function FeedSkeleton() {
  return (
    <div
      className="flex flex-col gap-5 w-full max-w-3xl mx-auto pb-10"
      aria-busy="true"
      aria-label="Loading posts"
    >
      {/* Post type tab skeleton */}
      <div className="flex gap-0 border-b border-slate-200 dark:border-[#283039]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-3 pb-2.5 pt-1">
            <Skeleton variant="text" className="h-4 w-16" />
          </div>
        ))}
      </div>

      {/* Tag chip bar skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="chip" />
        ))}
      </div>

      {/* Card skeleton */}
      <div className="flex flex-col gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   FeedPage - Suspense boundary for useSearchParams
   -------------------------------------------------------------------------- */

export function FeedPage() {
  return (
    <section
      className="w-full px-4 py-6"
      aria-labelledby="feed-heading"
    >
      <h1 id="feed-heading" className="sr-only">
        Complaint Feed
      </h1>
      <Suspense fallback={<FeedSkeleton />}>
        <FeedPageInner />
      </Suspense>
    </section>
  );
}
