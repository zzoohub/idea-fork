"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/shared/i18n/navigation";
import { Skeleton, EmptyState, ErrorState } from "@/src/shared/ui";
import { useScrollReveal } from "@/src/shared/lib/gsap";
import { BriefCard } from "@/src/entities/brief/ui";
import { ProductCard } from "@/src/entities/product/ui";
import { PostCard } from "@/src/entities/post/ui";
import { fetchBriefs } from "@/src/entities/brief/api";
import { fetchProducts } from "@/src/entities/product/api";
import { fetchPosts } from "@/src/entities/post/api";
import { extractDemandSignals } from "@/src/shared/lib/extract-demand-signals";
import { computeHeatLevel } from "@/src/shared/lib/compute-heat-level";
import { formatRelativeTime } from "@/src/shared/lib/format-relative-time";
import type { BriefListItem, ProductListItem, Post } from "@/src/shared/api";
import { trackSearchPerformed, trackSearchResultClicked } from "@/src/shared/analytics";

/* --------------------------------------------------------------------------
   Content type tabs
   -------------------------------------------------------------------------- */
const TYPE_TAB_KEYS = [
  { key: null, labelKey: "all" },
  { key: "briefs", labelKey: "briefs" },
  { key: "products", labelKey: "products" },
  { key: "posts", labelKey: "posts" },
] as const;

type ContentType = "briefs" | "products" | "posts";

const VALID_TYPES = new Set<string>(["briefs", "products", "posts"]);

const PREVIEW_LIMIT = 3;

/* --------------------------------------------------------------------------
   Map API source string to PostCard source type
   -------------------------------------------------------------------------- */
function mapSource(source: string) {
  const s = source.toLowerCase();
  if (s === "reddit") return "reddit" as const;
  if (s === "twitter" || s === "x") return "twitter" as const;
  if (s === "linkedin") return "linkedin" as const;
  if (s === "appstore" || s === "app_store") return "appstore" as const;
  if (s === "playstore" || s === "play_store" || s === "google_play")
    return "appstore" as const;
  return "reddit" as const;
}

function mapSourceName(post: Post): string {
  if (post.subreddit) return `r/${post.subreddit}`;
  const s = post.source.toLowerCase();
  if (s === "twitter" || s === "x") return "Twitter / X";
  if (s === "linkedin") return "LinkedIn";
  if (s === "appstore" || s === "app_store") return "App Store";
  if (s === "playstore" || s === "play_store" || s === "google_play")
    return "Google Play";
  return post.source;
}

/* --------------------------------------------------------------------------
   Client-side filter helpers
   -------------------------------------------------------------------------- */
function filterBriefs(briefs: BriefListItem[], query: string): BriefListItem[] {
  const q = query.toLowerCase();
  return briefs.filter(
    (b) =>
      b.title.toLowerCase().includes(q) ||
      b.summary.toLowerCase().includes(q),
  );
}


/* --------------------------------------------------------------------------
   SearchResultsInner
   -------------------------------------------------------------------------- */
function SearchResultsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("search");
  const tCommon = useTranslations("common");
  const tA11y = useTranslations("accessibility");

  const query = searchParams.get("q") ?? "";
  const rawType = searchParams.get("type");
  const activeType: ContentType | null = VALID_TYPES.has(rawType ?? "")
    ? (rawType as ContentType)
    : null;

  /* Redirect if no query */
  useEffect(() => {
    if (!query.trim()) {
      router.replace("/");
    }
  }, [query, router]);

  /* Data state */
  const [briefs, setBriefs] = useState<BriefListItem[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  /* Fetch all 3 types in parallel */
  const fetchData = useCallback(() => {
    if (!query.trim()) return;
    cancelRef.current = false;

    setLoading(true);
    setError(null);

    Promise.all([
      fetchBriefs({ limit: 100 }).catch(() => ({ data: [] as BriefListItem[] })),
      fetchProducts({ q: query, limit: 50 }).catch(() => ({ data: [] as ProductListItem[] })),
      fetchPosts({ q: query, limit: 50 }).catch(() => ({ data: [] as Post[] })),
    ])
      .then(([briefsRes, productsRes, postsRes]) => {
        if (cancelRef.current) return;
        setBriefs(briefsRes.data);
        setProducts(productsRes.data);
        setPosts(postsRes.data);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelRef.current) {
          setError(t("errors.searchFailed"));
          setLoading(false);
        }
      });
  }, [query, t]);

  useEffect(() => {
    fetchData();
    return () => {
      cancelRef.current = true;
    };
  }, [fetchData]);

  /* Filtered results (client-side for briefs, backend for products/posts) */
  const filteredBriefs = useMemo(
    () => (query ? filterBriefs(briefs, query) : []),
    [briefs, query],
  );
  const filteredProducts = products; // already filtered by backend
  const filteredPosts = posts; // already filtered by backend

  const totalResults =
    filteredBriefs.length + filteredProducts.length + filteredPosts.length;

  /* Track search_performed once when results are ready */
  const searchTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!loading && query.trim() && searchTrackedRef.current !== query) {
      searchTrackedRef.current = query;
      trackSearchPerformed({ query, results_count: totalResults });
    }
  }, [loading, query, totalResults]);

  /* Tab switching */
  const handleTabChange = useCallback(
    (type: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (type === null) {
        params.delete("type");
      } else {
        params.set("type", type);
      }
      const qs = params.toString();
      router.push(`/search${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleViewAll = useCallback(
    (type: ContentType) => {
      handleTabChange(type);
    },
    [handleTabChange],
  );

  const handleClearSearch = useCallback(() => {
    router.push("/");
  }, [router]);

  /* Roving tabindex for WAI-ARIA tabs pattern */
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeTabIndex = TYPE_TAB_KEYS.findIndex((t) => t.key === activeType);

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let nextIndex: number | null = null;
      if (e.key === "ArrowRight") {
        nextIndex = (index + 1) % TYPE_TAB_KEYS.length;
      } else if (e.key === "ArrowLeft") {
        nextIndex =
          (index - 1 + TYPE_TAB_KEYS.length) % TYPE_TAB_KEYS.length;
      } else if (e.key === "Home") {
        nextIndex = 0;
      } else if (e.key === "End") {
        nextIndex = TYPE_TAB_KEYS.length - 1;
      }
      if (nextIndex !== null) {
        e.preventDefault();
        tabRefs.current[nextIndex]?.focus();
        handleTabChange(TYPE_TAB_KEYS[nextIndex].key);
      }
    },
    [handleTabChange],
  );

  const panelId = `panel-${activeType ?? "all"}`;
  const activeTabId = `tab-${activeType ?? "all"}`;

  if (!query.trim()) return null;
  if (loading) return <SearchSkeleton />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-20 md:pb-10">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("resultsFor", { query })}
        </h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {t("resultCount", { count: totalResults })}
        </span>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center overflow-x-auto border-b border-slate-200 dark:border-[#283039] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label={tA11y("filterByContentType")}
      >
        {TYPE_TAB_KEYS.map((tab, index) => {
          const isActive = activeType === tab.key;
          const tabId = `tab-${tab.key ?? "all"}`;
          const count =
            tab.key === "briefs"
              ? filteredBriefs.length
              : tab.key === "products"
                ? filteredProducts.length
                : tab.key === "posts"
                  ? filteredPosts.length
                  : null;

          return (
            <button
              key={tab.labelKey}
              ref={(el) => { tabRefs.current[index] = el; }}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              aria-label={
                count !== null
                  ? `${t(`tabs.${tab.labelKey}`)}, ${t("resultCount", { count })}`
                  : t(`tabs.${tab.labelKey}`)
              }
              onClick={() => handleTabChange(tab.key)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={[
                "relative shrink-0 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors duration-150 cursor-pointer",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                isActive
                  ? "text-primary"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
              ].join(" ")}
            >
              {t(`tabs.${tab.labelKey}`)}
              {count !== null && ` (${count})`}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Results area */}
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={activeTabId}
        aria-live="polite"
      >
        {totalResults === 0 ? (
          <NoResults query={query} onClear={handleClearSearch} />
        ) : activeType === null ? (
          <AllResults
            briefs={filteredBriefs}
            products={filteredProducts}
            posts={filteredPosts}
            query={query}
            onViewAll={handleViewAll}
          />
        ) : activeType === "briefs" ? (
          <BriefsResults briefs={filteredBriefs} query={query} />
        ) : activeType === "products" ? (
          <ProductsResults products={filteredProducts} query={query} />
        ) : (
          <PostsResults posts={filteredPosts} query={query} />
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   "All" tab: grouped sections with preview limit
   -------------------------------------------------------------------------- */
function AllResults({
  briefs,
  products,
  posts,
  query,
  onViewAll,
}: {
  briefs: BriefListItem[];
  products: ProductListItem[];
  posts: Post[];
  query: string;
  onViewAll: (type: ContentType) => void;
}) {
  const t = useTranslations("search");
  const briefsGridRef = useScrollReveal();
  const productsGridRef = useScrollReveal();
  const postsListRef = useScrollReveal();
  return (
    <div className="flex flex-col gap-8">
      {briefs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            {t("tabs.briefs")}
          </h2>
          <div ref={briefsGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {briefs.slice(0, PREVIEW_LIMIT).map((brief, idx) => (
              <div key={brief.id} onClick={() => trackSearchResultClicked({ query, result_type: "brief", result_position: idx + 1 })}>
                <BriefCardItem brief={brief} />
              </div>
            ))}
          </div>
          {briefs.length > PREVIEW_LIMIT && (
            <ViewAllLink
              count={briefs.length}
              label={t("tabs.briefs").toLowerCase()}
              onClick={() => onViewAll("briefs")}
            />
          )}
        </section>
      )}

      {products.length > 0 && (
        <>
          {briefs.length > 0 && <Divider />}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t("tabs.products")}
            </h2>
            <div ref={productsGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.slice(0, PREVIEW_LIMIT).map((product, idx) => (
                <div key={product.slug} onClick={() => trackSearchResultClicked({ query, result_type: "product", result_position: idx + 1 })}>
                  <ProductCardItem product={product} />
                </div>
              ))}
            </div>
            {products.length > PREVIEW_LIMIT && (
              <ViewAllLink
                count={products.length}
                label={t("tabs.products").toLowerCase()}
                onClick={() => onViewAll("products")}
              />
            )}
          </section>
        </>
      )}

      {posts.length > 0 && (
        <>
          {(briefs.length > 0 || products.length > 0) && <Divider />}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t("tabs.posts")}
            </h2>
            <div ref={postsListRef} className="flex flex-col gap-5 max-w-3xl mx-auto">
              {posts.slice(0, PREVIEW_LIMIT).map((post, idx) => (
                <div key={post.id} onClick={() => trackSearchResultClicked({ query, result_type: "post", result_position: idx + 1 })}>
                  <PostCardItem post={post} query={query} />
                </div>
              ))}
            </div>
            {posts.length > PREVIEW_LIMIT && (
              <ViewAllLink
                count={posts.length}
                label={t("tabs.posts").toLowerCase()}
                onClick={() => onViewAll("posts")}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Type-specific tab views
   -------------------------------------------------------------------------- */
function BriefsResults({ briefs, query }: { briefs: BriefListItem[]; query: string }) {
  if (briefs.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {briefs.map((brief, idx) => (
        <div key={brief.id} onClick={() => trackSearchResultClicked({ query, result_type: "brief", result_position: idx + 1 })}>
          <BriefCardItem brief={brief} />
        </div>
      ))}
    </div>
  );
}

function ProductsResults({ products, query }: { products: ProductListItem[]; query: string }) {
  if (products.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product, idx) => (
        <div key={product.slug} onClick={() => trackSearchResultClicked({ query, result_type: "product", result_position: idx + 1 })}>
          <ProductCardItem product={product} />
        </div>
      ))}
    </div>
  );
}

function PostsResults({ posts, query }: { posts: Post[]; query: string }) {
  if (posts.length === 0) return null;
  return (
    <div className="flex flex-col gap-5 max-w-3xl mx-auto">
      {posts.map((post, idx) => (
        <div key={post.id} onClick={() => trackSearchResultClicked({ query, result_type: "post", result_position: idx + 1 })}>
          <PostCardItem post={post} query={query} />
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Card wrappers (map data → card props)
   -------------------------------------------------------------------------- */
function BriefCardItem({ brief }: { brief: BriefListItem }) {
  const parsed = extractDemandSignals(brief.demand_signals);
  const heatLevel = computeHeatLevel({
    postCount: parsed.postCount,
    newestPostAt: parsed.newestPostAt,
  });
  const freshness = parsed.newestPostAt
    ? formatRelativeTime(parsed.newestPostAt)
    : null;

  return (
    <BriefCard
      title={brief.title}
      heatLevel={heatLevel}
      complaintCount={parsed.postCount || brief.source_count}
      communityCount={parsed.subredditCount || 1}
      freshness={freshness}
      snippet={brief.summary}
      tags={[]}
      slug={brief.slug}
    />
  );
}

function ProductCardItem({ product }: { product: ProductListItem }) {
  return (
    <ProductCard
      name={product.name}
      slug={product.slug}
      iconUrl={product.image_url ?? undefined}
      productUrl={product.url ?? undefined}
      category={product.category ?? "Uncategorized"}
      heatLevel={computeHeatLevel({
        postCount: product.complaint_count,
        newestPostAt: product.launched_at,
      })}
      signalCount={product.complaint_count}
      tagline={product.tagline ?? product.description ?? ""}
      source={product.source ?? undefined}
      tags={product.tags ?? []}
    />
  );
}

function PostCardItem({ post, query }: { post: Post; query: string }) {
  return (
    <PostCard
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
    />
  );
}

/* --------------------------------------------------------------------------
   Small shared components
   -------------------------------------------------------------------------- */
function ViewAllLink({
  count,
  label,
  onClick,
}: {
  count: number;
  label: string;
  onClick: () => void;
}) {
  const tCommon = useTranslations("common");
  return (
    <div className="mt-4 flex justify-end">
      <button
        type="button"
        onClick={onClick}
        className="text-sm font-semibold text-primary hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {tCommon("viewAll", { count, label })} &rarr;
      </button>
    </div>
  );
}

function Divider() {
  return (
    <hr className="border-slate-200 dark:border-[#283039]" />
  );
}

function NoResults({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  const t = useTranslations("search");
  const tCommon = useTranslations("common");
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center py-layout-lg text-center">
      <p className="text-body text-text-secondary">
        {t("empty.message", { query })}
      </p>
      <p className="mt-space-sm text-body-sm text-text-tertiary max-w-[320px]">
        {t("empty.suggestion")}
      </p>
      <div className="mt-space-lg flex items-center gap-3">
        <button
          type="button"
          onClick={onClear}
          className="px-4 py-2 text-sm font-medium rounded-lg text-text-secondary hover:bg-bg-tertiary transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {tCommon("clearSearch")}
        </button>
        <button
          type="button"
          onClick={() => router.push("/briefs")}
          className="px-4 py-2 text-sm font-semibold rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {t("empty.browseBriefs")}
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Loading skeleton
   -------------------------------------------------------------------------- */
function SearchSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-20 md:pb-10"
      aria-busy="true"
      aria-label="Loading search results"
    >
      {/* Header skeleton */}
      <div className="flex items-baseline justify-between">
        <Skeleton variant="text" className="h-8 w-64" />
        <Skeleton variant="text" className="h-4 w-20" />
      </div>

      {/* Tab skeleton */}
      <div className="flex gap-0 border-b border-slate-200 dark:border-[#283039]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-3 pb-2.5 pt-1">
            <Skeleton variant="text" className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Section: Briefs skeleton */}
      <div className="flex flex-col gap-4">
        <Skeleton variant="text" className="h-6 w-16" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-72" />
          ))}
        </div>
      </div>

      {/* Section: Products skeleton */}
      <div className="flex flex-col gap-4">
        <Skeleton variant="text" className="h-6 w-20" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-72" />
          ))}
        </div>
      </div>

      {/* Section: Posts skeleton */}
      <div className="flex flex-col gap-4">
        <Skeleton variant="text" className="h-6 w-14" />
        <div className="flex flex-col gap-5 max-w-3xl mx-auto w-full">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-36" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   SearchResultsPage - Suspense boundary for useSearchParams
   -------------------------------------------------------------------------- */
export function SearchResultsPage() {
  return (
    <section className="w-full px-4 py-6">
      <Suspense fallback={<SearchSkeleton />}>
        <SearchResultsInner />
      </Suspense>
    </section>
  );
}
