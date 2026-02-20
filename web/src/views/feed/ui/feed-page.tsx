"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, Suspense } from "react";
import { Skeleton, EmptyState } from "@/src/shared/ui";
import { FilterChipBar } from "@/src/features/filter/ui";
import { PostCard } from "@/src/entities/post/ui";

/* --------------------------------------------------------------------------
   Mock Data
   TODO: Replace with API data
   -------------------------------------------------------------------------- */

const MOCK_TAGS = [
  { label: "SaaS", icon: "cloud" },
  { label: "Mobile App", icon: "smartphone" },
  { label: "Developer Tools", icon: "terminal" },
  { label: "E-commerce", icon: "shopping_cart" },
  { label: "Fintech", icon: "account_balance" },
  { label: "Health", icon: "favorite" },
  { label: "Education", icon: "school" },
  { label: "Productivity", icon: "task_alt" },
  { label: "AI", icon: "auto_awesome" },
];

const MOCK_TYPE_FILTERS = [
  { label: "Complaint", icon: "sentiment_dissatisfied", color: "text-amber-500" },
  { label: "Feature Request", icon: "lightbulb", color: "text-emerald-500" },
  { label: "Question", icon: "help", color: "text-blue-400" },
];

const MOCK_POSTS: Array<{
  id: string;
  source: "reddit" | "twitter" | "linkedin" | "appstore";
  sourceName: string;
  date: string;
  username?: string;
  title?: string;
  snippet: string;
  sentiment?: "frustrated" | "request" | "question" | "bug_report";
  category?: string;
  tags: string[];
  upvotes: number;
  commentCount?: number;
  originalUrl: string;
  briefSlug?: string;
}> = [
  {
    id: "1",
    source: "reddit",
    sourceName: "r/SaaS",
    date: "2 hours ago",
    username: "u/indie_founder",
    title: "Why is every invoicing tool so bloated?",
    snippet:
      "I've been looking for a simple invoicing tool for freelancers that doesn't require a PhD to set up. Every tool I try has 50 features I don't need and buries the one thing I actually want behind three menus.",
    sentiment: "frustrated",
    category: "SaaS",
    tags: ["SaaS", "Fintech"],
    upvotes: 342,
    commentCount: 89,
    originalUrl: "https://reddit.com/r/SaaS/example1",
    briefSlug: "simple-invoicing-freelancers",
  },
  {
    id: "2",
    source: "appstore",
    sourceName: "App Store",
    date: "5 hours ago",
    username: "HabitUser2024",
    title: "Custom reminders keep crashing the app",
    snippet:
      "This habit tracker crashes every time I try to set a custom reminder. I just want something that works reliably without all the gamification nonsense. Let me track my habits in peace.",
    sentiment: "bug_report",
    category: "Mobile App",
    tags: ["Mobile App", "Health"],
    upvotes: 128,
    commentCount: 12,
    originalUrl: "https://apps.apple.com/example2",
  },
  {
    id: "3",
    source: "reddit",
    sourceName: "r/webdev",
    date: "8 hours ago",
    username: "u/devops_dude",
    title: "Affordable error monitoring for small teams?",
    snippet:
      "Why is there still no decent open-source error monitoring that doesn't cost $400/mo for a small team? Sentry pricing is insane for indie devs. We need something between console.log and enterprise observability.",
    sentiment: "request",
    category: "Developer Tools",
    tags: ["Developer Tools", "SaaS"],
    upvotes: 891,
    commentCount: 234,
    originalUrl: "https://reddit.com/r/webdev/example3",
    briefSlug: "affordable-error-monitoring",
  },
  {
    id: "4",
    source: "twitter",
    sourceName: "@shopify_seller",
    date: "12 hours ago",
    username: "@ecom_jane",
    title: "Variant picker UX is killing conversions",
    snippet:
      "Spent 3 hours trying to get Shopify product variants to display properly. The variant picker UX on most themes is terrible for products with more than 2 options. Customers just abandon cart.",
    sentiment: "frustrated",
    category: "E-commerce",
    tags: ["E-commerce"],
    upvotes: 256,
    commentCount: 45,
    originalUrl: "https://twitter.com/example4",
  },
  {
    id: "5",
    source: "appstore",
    sourceName: "App Store",
    date: "1 day ago",
    username: "SubwayLearner",
    title: "Please add offline mode",
    snippet:
      "Please add offline mode. I commute on the subway and lose connection constantly. An educational app that requires internet to review flashcards defeats the entire purpose.",
    sentiment: "request",
    category: "Education",
    tags: ["Education", "Mobile App"],
    upvotes: 67,
    commentCount: 8,
    originalUrl: "https://apps.apple.com/example5",
    briefSlug: "offline-first-learning",
  },
  {
    id: "6",
    source: "linkedin",
    sourceName: "LinkedIn",
    date: "1 day ago",
    username: "Sarah Chen, PM",
    title: "Why do PM tools ignore non-technical stakeholders?",
    snippet:
      "Every project management tool tries to be everything. I don't need Gantt charts, resource allocation, or time tracking. I need a shared to-do list that my non-technical clients can actually use.",
    sentiment: "question",
    category: "Productivity",
    tags: ["Productivity", "SaaS"],
    upvotes: 534,
    commentCount: 156,
    originalUrl: "https://linkedin.com/example6",
  },
];

/* --------------------------------------------------------------------------
   FeedPageInner - reads search params
   -------------------------------------------------------------------------- */

function FeedPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTag = searchParams.get("tag");

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

  const handleTagClick = useCallback(
    (tag: string) => updateParam("tag", tag === activeTag ? null : tag),
    [updateParam, activeTag],
  );

  /* Filtering (mock - in production this is server-side) */
  const filteredPosts = MOCK_POSTS.filter((post) => {
    if (activeTag && !post.tags.includes(activeTag)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-5 w-full max-w-3xl mx-auto pb-10">
      {/* Filter ribbon */}
      <FilterChipBar
        tags={MOCK_TAGS}
        activeTag={activeTag}
        onTagChange={handleTagChange}
        typeFilters={MOCK_TYPE_FILTERS}
      />

      {/* Feed cards */}
      {filteredPosts.length > 0 ? (
        <div
          className="flex flex-col gap-5"
          role="feed"
          aria-label="User complaints feed"
        >
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              source={post.source}
              sourceName={post.sourceName}
              date={post.date}
              username={post.username}
              title={post.title}
              snippet={post.snippet}
              sentiment={post.sentiment}
              category={post.category}
              tags={post.tags}
              upvotes={post.upvotes}
              commentCount={post.commentCount}
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
          action={{
            label: "Clear filters",
            onClick: () => {
              router.push("/", { scroll: false });
            },
          }}
        />
      )}

      {/* Load More button */}
      {filteredPosts.length > 0 && (
        <button
          type="button"
          className={[
            "mx-auto px-6 py-2.5",
            "rounded-lg border border-slate-200 dark:border-[#283039]",
            "bg-white dark:bg-[#1b2531]",
            "text-sm font-semibold text-slate-700 dark:text-slate-300",
            "hover:bg-slate-50 dark:hover:bg-[#232b36]",
            "hover:border-[#137fec]/50",
            "transition-colors duration-200",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#137fec]",
          ].join(" ")}
        >
          Load More
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
      {/* Chip bar skeleton */}
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
