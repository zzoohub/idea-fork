"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/shared/i18n/navigation";
import { Skeleton, EmptyState, ErrorState } from "@/src/shared/ui";
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

function filterProducts(
  products: ProductListItem[],
  query: string,
): ProductListItem[] {
  const q = query.toLowerCase();
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.description?.toLowerCase().includes(q) ?? false) ||
      (p.tagline?.toLowerCase().includes(q) ?? false) ||
      (p.category?.toLowerCase().includes(q) ?? false),
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

  /* Fetch all 3 types in parallel */
  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    Promise.all([
      fetchBriefs({ limit: 200 }).catch(() => ({ data: [] as BriefListItem[] })),
      fetchProducts({ limit: 200 }).catch(() => ({ data: [] as ProductListItem[] })),
      fetchPosts({ q: query, limit: 50 }).catch(() => ({ data: [] as Post[] })),
    ])
      .then(([briefsRes, productsRes, postsRes]) => {
        if (cancelled) return;
        setBriefs(briefsRes.data);
        setProducts(productsRes.data);
        setPosts(postsRes.data);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(t("errors.searchFailed"));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query, t]);

  /* Filtered results (client-side for briefs/products, backend for posts) */
  const filteredBriefs = useMemo(
    () => (query ? filterBriefs(briefs, query) : []),
    [briefs, query],
  );
  const filteredProducts = useMemo(
    () => (query ? filterProducts(products, query) : []),
    [products, query],
  );
  const filteredPosts = posts; // already filtered by backend

  const totalResults =
    filteredBriefs.length + filteredProducts.length + filteredPosts.length;

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

  if (!query.trim()) return null;
  if (loading) return <SearchSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

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
        {TYPE_TAB_KEYS.map((tab) => {
          const isActive = activeType === tab.key;
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
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={
                count !== null
                  ? `${t(`tabs.${tab.labelKey}`)}, ${t("resultCount", { count })}`
                  : t(`tabs.${tab.labelKey}`)
              }
              onClick={() => handleTabChange(tab.key)}
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
      <div aria-live="polite">
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
          <BriefsResults briefs={filteredBriefs} />
        ) : activeType === "products" ? (
          <ProductsResults products={filteredProducts} />
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
  return (
    <div className="flex flex-col gap-8">
      {briefs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            {t("tabs.briefs")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {briefs.slice(0, PREVIEW_LIMIT).map((brief) => (
              <BriefCardItem key={brief.id} brief={brief} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.slice(0, PREVIEW_LIMIT).map((product) => (
                <ProductCardItem key={product.slug} product={product} />
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
            <div className="flex flex-col gap-5 max-w-3xl mx-auto">
              {posts.slice(0, PREVIEW_LIMIT).map((post) => (
                <PostCardItem key={post.id} post={post} query={query} />
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
function BriefsResults({ briefs }: { briefs: BriefListItem[] }) {
  if (briefs.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {briefs.map((brief) => (
        <BriefCardItem key={brief.id} brief={brief} />
      ))}
    </div>
  );
}

function ProductsResults({ products }: { products: ProductListItem[] }) {
  if (products.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCardItem key={product.slug} product={product} />
      ))}
    </div>
  );
}

function PostsResults({ posts, query }: { posts: Post[]; query: string }) {
  if (posts.length === 0) return null;
  return (
    <div className="flex flex-col gap-5 max-w-3xl mx-auto">
      {posts.map((post) => (
        <PostCardItem key={post.id} post={post} query={query} />
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
        className="text-sm font-semibold text-primary hover:underline cursor-pointer"
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
  return (
    <EmptyState
      message={t("empty.message", { query })}
      suggestion={t("empty.suggestion")}
      action={{ label: tCommon("clearSearch"), onClick: onClear }}
    />
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
    </div>
  );
}

/* --------------------------------------------------------------------------
   SearchResultsPage - Suspense boundary for useSearchParams
   -------------------------------------------------------------------------- */
export function SearchResultsPage() {
  const t = useTranslations("search");

  return (
    <section className="w-full px-4 py-6" aria-labelledby="search-heading">
      <h1 id="search-heading" className="sr-only">
        {t("heading")}
      </h1>
      <Suspense fallback={<SearchSkeleton />}>
        <SearchResultsInner />
      </Suspense>
    </section>
  );
}
