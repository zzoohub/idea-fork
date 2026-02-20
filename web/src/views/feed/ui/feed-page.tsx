"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, Suspense } from "react";
import {
  SearchInput,
  SortDropdown,
  Skeleton,
  EmptyState,
  // ErrorState — uncomment when wiring real API
} from "@/src/shared/ui";
import { FilterChipBar } from "@/src/features/filter/ui";
import { PostCard } from "@/src/entities/post/ui";

/* --------------------------------------------------------------------------
   Mock Data
   TODO: Replace with API data
   -------------------------------------------------------------------------- */
const MOCK_TAGS = [
  "SaaS",
  "Mobile",
  "DevTools",
  "E-commerce",
  "Fintech",
  "Health",
  "Education",
  "Productivity",
  "AI",
];

const MOCK_POSTS: Array<{
  id: string;
  source: "reddit" | "appstore";
  sourceName: string;
  date: string;
  snippet: string;
  tags: string[];
  upvotes: number;
  originalUrl: string;
  briefSlug?: string;
}> = [
  {
    id: "1",
    source: "reddit",
    sourceName: "r/SaaS",
    date: "2 hours ago",
    snippet:
      "I've been looking for a simple invoicing tool for freelancers that doesn't require a PhD to set up. Every tool I try has 50 features I don't need and buries the one thing I actually want behind three menus.",
    tags: ["SaaS", "Fintech"],
    upvotes: 342,
    originalUrl: "https://reddit.com/r/SaaS/example1",
    briefSlug: "simple-invoicing-freelancers",
  },
  {
    id: "2",
    source: "appstore",
    sourceName: "App Store",
    date: "5 hours ago",
    snippet:
      "This habit tracker crashes every time I try to set a custom reminder. I just want something that works reliably without all the gamification nonsense. Let me track my habits in peace.",
    tags: ["Mobile", "Health"],
    upvotes: 128,
    originalUrl: "https://apps.apple.com/example2",
  },
  {
    id: "3",
    source: "reddit",
    sourceName: "r/webdev",
    date: "8 hours ago",
    snippet:
      "Why is there still no decent open-source error monitoring that doesn't cost $400/mo for a small team? Sentry pricing is insane for indie devs. We need something between console.log and enterprise observability.",
    tags: ["DevTools", "SaaS"],
    upvotes: 891,
    originalUrl: "https://reddit.com/r/webdev/example3",
    briefSlug: "affordable-error-monitoring",
  },
  {
    id: "4",
    source: "reddit",
    sourceName: "r/ecommerce",
    date: "12 hours ago",
    snippet:
      "Spent 3 hours trying to get Shopify product variants to display properly. The variant picker UX on most themes is terrible for products with more than 2 options. Customers just abandon cart.",
    tags: ["E-commerce"],
    upvotes: 256,
    originalUrl: "https://reddit.com/r/ecommerce/example4",
  },
  {
    id: "5",
    source: "appstore",
    sourceName: "App Store",
    date: "1 day ago",
    snippet:
      "Please add offline mode. I commute on the subway and lose connection constantly. An educational app that requires internet to review flashcards defeats the entire purpose.",
    tags: ["Education", "Mobile"],
    upvotes: 67,
    originalUrl: "https://apps.apple.com/example5",
    briefSlug: "offline-first-learning",
  },
  {
    id: "6",
    source: "reddit",
    sourceName: "r/productivity",
    date: "1 day ago",
    snippet:
      "Every project management tool tries to be everything. I don't need Gantt charts, resource allocation, or time tracking. I need a shared to-do list that my non-technical clients can actually use.",
    tags: ["Productivity", "SaaS"],
    upvotes: 534,
    originalUrl: "https://reddit.com/r/productivity/example6",
  },
];

const SORT_OPTIONS = [
  { value: "trending", label: "Trending" },
  { value: "recent", label: "Recent" },
];

/* --------------------------------------------------------------------------
   FeedPage — Inner component (reads search params)
   -------------------------------------------------------------------------- */
function FeedPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTag = searchParams.get("tag");
  const sortBy = searchParams.get("sort") ?? "trending";
  const searchQuery = searchParams.get("q") ?? "";

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

  const handleSortChange = useCallback(
    (value: string) => updateParam("sort", value === "trending" ? null : value),
    [updateParam],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => updateParam("q", e.target.value),
    [updateParam],
  );

  const handleSearchClear = useCallback(
    () => updateParam("q", null),
    [updateParam],
  );

  const handleTagClick = useCallback(
    (tag: string) => updateParam("tag", tag === activeTag ? null : tag),
    [updateParam, activeTag],
  );

  /* Filtering (mock — in production this is server-side) */
  const filteredPosts = MOCK_POSTS.filter((post) => {
    if (activeTag && !post.tags.includes(activeTag)) return false;
    if (
      searchQuery &&
      !post.snippet.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  /* ---------- Render states ---------- */

  // Uncomment to preview error state:
  // return <ErrorState message="Failed to load posts." onRetry={() => {}} />;

  return (
    <div className="flex flex-col gap-layout-sm">
      {/* ---- Toolbar: Search + Sort ---- */}
      <div className="flex items-center gap-space-lg">
        <SearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          onClear={handleSearchClear}
          placeholder="Search complaints..."
          className="hidden lg:flex flex-1"
        />
        <SortDropdown
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={handleSortChange}
          className="ml-auto"
        />
      </div>

      {/* ---- Filter chips ---- */}
      <FilterChipBar
        tags={MOCK_TAGS}
        activeTag={activeTag}
        onTagChange={handleTagChange}
      />

      {/* ---- Post grid ---- */}
      {filteredPosts.length > 0 ? (
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-card-gap"
          role="feed"
          aria-label="User complaints feed"
        >
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              source={post.source}
              sourceName={post.sourceName}
              date={post.date}
              snippet={post.snippet}
              tags={post.tags}
              upvotes={post.upvotes}
              originalUrl={post.originalUrl}
              briefSlug={post.briefSlug}
              onTagClick={handleTagClick}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          message="No posts match your filters."
          suggestion="Try removing a filter or searching for something else."
          action={{ label: "Clear filters", onClick: () => {
            router.push("/", { scroll: false });
          }}}
        />
      )}

      {/* ---- Loading skeleton (toggle manually to preview) ---- */}
      {/* <FeedSkeleton /> */}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Loading skeleton
   -------------------------------------------------------------------------- */
function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-layout-sm" aria-busy="true" aria-label="Loading posts">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-space-lg">
        <Skeleton variant="text" className="hidden lg:block h-[40px] max-w-[400px]" />
        <Skeleton variant="chip" className="ml-auto w-[120px]" />
      </div>

      {/* Chip bar skeleton */}
      <div className="flex gap-space-sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="chip" />
        ))}
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-card-gap">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   FeedPage — Suspense boundary for useSearchParams
   -------------------------------------------------------------------------- */
export function FeedPage() {
  return (
    <section
      className="mx-auto w-full max-w-[1200px] px-layout-xs py-layout-sm"
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
