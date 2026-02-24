"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/src/shared/i18n/navigation";
import { Icon } from "@/src/shared/ui/icon";
import { Badge } from "@/src/shared/ui/badge";
import { Chip } from "@/src/shared/ui/chip";
import { ErrorState } from "@/src/shared/ui/error-state";
import { EmptyState } from "@/src/shared/ui/empty-state";
import {
  ProductHeader,
  ComplaintSummary,
} from "@/src/entities/product/ui";
import { isSafeUrl } from "@/src/shared/lib/sanitize-url";
import { fetchProduct } from "@/src/entities/product/api";
import type { ProductDetail, ProductPost } from "@/src/shared/api";
import { formatRelativeTime } from "@/src/shared/lib/format-relative-time";
import { useStaggerReveal, useScrollReveal } from "@/src/shared/lib/gsap";

const INITIAL_VISIBLE_COUNT = 3;

/* --------------------------------------------------------------------------
   Compute themes from post_type breakdown
   -------------------------------------------------------------------------- */
const POST_TYPE_LABEL_KEY: Record<string, string> = {
  need: "need",
  complaint: "complaint",
  feature_request: "featureRequest",
  alternative_seeking: "alternative",
  comparison: "comparison",
  question: "question",
  review: "review",
  showcase: "showcase",
  discussion: "discussion",
  other: "other",
};

interface ComputedTheme {
  type: string;
  name: string;
  count: number;
}

function computeThemes(
  posts: ProductPost[],
  getLabel: (key: string) => string,
): ComputedTheme[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    const pt = post.post_type;
    if (!pt) continue;
    counts.set(pt, (counts.get(pt) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      name: getLabel(POST_TYPE_LABEL_KEY[type] ?? type),
      count,
    }));
}

/* --------------------------------------------------------------------------
   Sentiment config
   DB sentiment values: positive | negative | neutral | mixed
   DB post_type values: need | complaint | feature_request |
     alternative_seeking | comparison | question | review |
     showcase | discussion | other
   -------------------------------------------------------------------------- */
const SENTIMENT_BADGE: Record<
  string,
  { labelKey: "frustrated"; variant: "frustrated" }
> = {
  negative: { labelKey: "frustrated", variant: "frustrated" },
};

/* Severity for "Most Critical" sort — lower = more critical.
   Checked against post.sentiment first, then post.post_type. */
const SEVERITY_ORDER: Record<string, number> = {
  // sentiment
  negative: 0,
  // post_type
  complaint: 1,
  need: 1,
  feature_request: 2,
  alternative_seeking: 2,
  question: 3,
};

function getSeverity(post: ProductPost): number {
  return SEVERITY_ORDER[post.sentiment ?? ""] ?? SEVERITY_ORDER[post.post_type ?? ""] ?? 99;
}

function getSourceConfig(post: ProductPost) {
  const s = post.source.toLowerCase();
  if (s === "reddit") {
    return {
      label: post.subreddit ? `r/${post.subreddit}` : "Reddit",
      color: "bg-orange-500",
      icon: "r/",
    };
  }
  if (s === "twitter" || s === "x") {
    return { label: "Twitter/X", color: "bg-sky-500", icon: "X" };
  }
  if (s === "appstore" || s === "app_store") {
    return { label: "App Store", color: "bg-blue-500", icon: "A" };
  }
  if (s === "playstore" || s === "play_store") {
    return { label: "Play Store", color: "bg-green-500", icon: "P" };
  }
  if (s === "producthunt") {
    return { label: "Product Hunt", color: "bg-orange-600", icon: "PH" };
  }
  return { label: post.source, color: "bg-slate-500", icon: post.source[0] ?? "?" };
}

/* --------------------------------------------------------------------------
   ProductDetailPage
   -------------------------------------------------------------------------- */

interface ProductDetailPageProps {
  slug: string;
}

export function ProductDetailPage({ slug }: ProductDetailPageProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllComplaints, setShowAllComplaints] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "critical">("recent");
  const [activePostType, setActivePostType] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const t = useTranslations("productDetail");
  const tCommon = useTranslations("common");
  const tA11y = useTranslations("accessibility");
  const tFeed = useTranslations("feed.postTypes");

  useEffect(() => {
    let cancelled = false;

    fetchProduct(slug)
      .then((res) => {
        if (!cancelled) {
          setProduct(res.data);
          setLoading(false);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(t("errors.loadFailed"));
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [slug, t]);

  const headerRef = useStaggerReveal({ selector: "> *", stagger: 0.1 });
  const complaintsRef = useScrollReveal({ selector: "> article" });
  const relatedRef = useScrollReveal();

  if (loading) return <ProductDetailSkeleton />;
  if (error || !product) return <ErrorState message={error ?? t("errors.notFound")} onRetry={() => window.location.reload()} />;

  const computedThemes = computeThemes(product.posts, (key) => tFeed(key as never));

  // Collect available post types from data (for filter chips)
  const availablePostTypes = computedThemes.map((th) => th.type);

  const filteredPosts = activePostType
    ? product.posts.filter((p) => p.post_type === activePostType)
    : product.posts;

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === "popular") return b.score - a.score;
    if (sortBy === "critical") return getSeverity(a) - getSeverity(b);
    return new Date(b.external_created_at).getTime() - new Date(a.external_created_at).getTime();
  });

  const visibleComplaints = showAllComplaints
    ? sortedPosts
    : sortedPosts.slice(0, INITIAL_VISIBLE_COUNT);

  const remainingCount = sortedPosts.length - INITIAL_VISIBLE_COUNT;

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      {/* Breadcrumbs */}
      <nav aria-label={tA11y("breadcrumb")} className="mb-6">
        <ol className="flex items-center gap-1.5 text-sm">
          <li>
            <Link
              href="/products"
              className="text-slate-500 dark:text-slate-400 hover:text-[#137fec] transition-colors duration-150 no-underline"
            >
              {t("breadcrumbProducts")}
            </Link>
          </li>
          <li aria-hidden="true">
            <Icon
              name="chevron-right"
              size={16}
              className="text-slate-400 dark:text-slate-500"
            />
          </li>
          <li>
            <span className="text-slate-900 dark:text-slate-50 font-medium">
              {product.name}
            </span>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div ref={headerRef} className="space-y-6 mb-10">
        <ProductHeader
          name={product.name}
          iconUrl={product.image_url ?? undefined}
          category={product.category ?? tCommon("uncategorized")}
          tagline={product.tagline ?? undefined}
          description={product.description ?? undefined}
          launchedAt={product.launched_at ?? undefined}
          websiteUrl={product.url ?? undefined}
        />

        <ComplaintSummary
          totalMentions={product.metrics?.total_mentions ?? product.complaint_count}
          criticalComplaints={product.metrics?.negative_count ?? product.posts.filter((p) => p.sentiment === "negative").length}
          frustrationRate={(() => {
            const total = product.metrics?.total_mentions ?? product.complaint_count;
            const negative = product.metrics?.negative_count ?? product.posts.filter((p) => p.sentiment === "negative").length;
            return total > 0 ? Math.round((negative / total) * 100) : null;
          })()}
          themes={computedThemes}
        />
      </div>

      {/* Themes section */}
      {computedThemes.length > 0 && (
        <section aria-labelledby="themes-heading" className="mb-8">
          <h2
            id="themes-heading"
            className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-3"
          >
            {t("complaintThemes")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {computedThemes.map((theme) => (
              <Chip
                key={theme.type}
                variant={activePostType === theme.type ? "active" : "inactive"}
                aria-pressed={activePostType === theme.type}
                onClick={() =>
                  setActivePostType((prev) =>
                    prev === theme.type ? null : theme.type,
                  )
                }
              >
                {theme.name} ({theme.count})
              </Chip>
            ))}
          </div>
        </section>
      )}

      {/* Complaint feed */}
      <section aria-labelledby="complaints-heading">
        {/* Section header with sort controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h2
            id="complaints-heading"
            className="text-xl font-bold text-slate-900 dark:text-slate-50"
          >
            {t("userComplaints")}
            <span className="ml-2 text-base font-normal text-slate-500 dark:text-slate-400">
              ({sortedPosts.length})
            </span>
          </h2>

          <div className="flex items-center gap-2">
            {(["recent", "popular", "critical"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={sortBy === option}
                className={[
                  "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#137fec]",
                  sortBy === option
                    ? "bg-[#137fec] text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
                ].join(" ")}
                onClick={() => setSortBy(option)}
              >
                {t(option === "recent" ? "sortRecent" : option === "popular" ? "sortPopular" : "sortCritical")}
              </button>
            ))}
          </div>
        </div>

        {/* Filter chips */}
        {availablePostTypes.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label={tA11y("filterByPostType")}>
            <Chip
              variant={activePostType === null ? "active" : "inactive"}
              aria-pressed={activePostType === null}
              onClick={() => setActivePostType(null)}
            >
              {tFeed("all")}
            </Chip>
            {availablePostTypes.map((pt) => (
              <Chip
                key={pt}
                variant={activePostType === pt ? "active" : "inactive"}
                aria-pressed={activePostType === pt}
                onClick={() =>
                  setActivePostType((prev) => (prev === pt ? null : pt))
                }
              >
                {tFeed((POST_TYPE_LABEL_KEY[pt] ?? pt) as never)}
              </Chip>
            ))}
          </div>
        )}

        {/* Complaint cards */}
        {sortedPosts.length === 0 ? (
          <EmptyState
            message={t("complaintsEmpty")}
            suggestion={t("complaintsEmptySuggestion")}
            action={activePostType ? {
              label: tCommon("clearFilter"),
              onClick: () => setActivePostType(null),
            } : {
              label: t("browseProducts"),
              onClick: () => { window.location.href = "/products"; },
            }}
          />
        ) : (
          <div ref={complaintsRef} className="space-y-4">
            {visibleComplaints.map((complaint) => {
              const badge = complaint.sentiment
                ? SENTIMENT_BADGE[complaint.sentiment]
                : undefined;
              const srcCfg = getSourceConfig(complaint);
              const isExpanded = expandedIds.has(complaint.id);
              return (
                <article
                  key={complaint.id}
                  className={[
                    "group p-5 rounded-2xl cursor-pointer",
                    "bg-white dark:bg-[#18212F]",
                    "border border-slate-200 dark:border-[#283039]",
                    "hover:border-[#137fec]/50",
                    "transition-all duration-200",
                  ].join(" ")}
                  onClick={() => toggleExpanded(complaint.id)}
                >
                  {/* Title */}
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 group-hover:text-[#137fec] transition-colors duration-150 mb-2">
                    {complaint.title}
                  </h3>

                  {/* Metadata row: source + time + sentiment */}
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={[
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                        srcCfg.color,
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      {srcCfg.icon}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {t("sourceIn", { source: srcCfg.label })}
                      </span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                        &middot;
                      </span>
                      <time className="text-xs text-slate-400 dark:text-slate-500">
                        {formatRelativeTime(complaint.external_created_at)}
                      </time>
                    </div>
                    {badge && (
                      <Badge variant={badge.variant}>
                        {t(`sentiment.${badge.labelKey}`)}
                      </Badge>
                    )}
                  </div>

                  {/* Body */}
                  {complaint.body && (
                    <p className={[
                      "text-sm text-slate-500 dark:text-slate-400 leading-relaxed",
                      isExpanded ? "" : "line-clamp-2",
                    ].filter(Boolean).join(" ")}>
                      {complaint.body}
                    </p>
                  )}

                  {/* Footer: actions */}
                  <div className="flex items-center gap-5 mt-4 pt-3 border-t border-slate-100 dark:border-[#283039]">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Icon name="thumbs-up" size={14} />
                      <span className="tabular-nums">{complaint.score.toLocaleString()}</span>
                    </span>
                    <span className="flex-1" />
                    {isExpanded && isSafeUrl(complaint.external_url) && (
                      <a
                        href={complaint.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#137fec] hover:text-[#0f6bca] transition-colors duration-150"
                      >
                        {tCommon("viewOriginal")}
                        <Icon name="external-link" size={14} />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Show more / fewer */}
        {sortedPosts.length > 0 && remainingCount > 0 && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              className={[
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl",
                "text-sm font-semibold text-[#137fec]",
                "bg-[#137fec]/5 hover:bg-[#137fec]/10",
                "border border-[#137fec]/20",
                "transition-colors duration-150 cursor-pointer",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#137fec]",
              ].join(" ")}
              onClick={() => setShowAllComplaints((prev) => !prev)}
            >
              <Icon
                name={showAllComplaints ? "chevron-up" : "chevron-down"}
                size={18}
              />
              {showAllComplaints
                ? tCommon("showFewerComplaints")
                : tCommon("showAllComplaints", { count: sortedPosts.length })}
            </button>
          </div>
        )}
      </section>

      {/* Related Briefs */}
      <section aria-labelledby="related-briefs-heading" className="mt-10">
        <h2
          id="related-briefs-heading"
          className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-6"
        >
          {t("relatedBriefs")}
        </h2>

        {product.related_briefs.length > 0 ? (
          <div ref={relatedRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {product.related_briefs.map((brief) => (
              <Link
                key={brief.id}
                href={`/briefs/${brief.slug}`}
                className="group block p-5 rounded-2xl bg-white dark:bg-[#18212F] border border-slate-200 dark:border-[#283039] hover:border-[#137fec]/50 transition-all duration-200 no-underline"
              >
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 group-hover:text-[#137fec] transition-colors duration-150 line-clamp-2 mb-2">
                  {brief.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-4">
                  {brief.summary}
                </p>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Icon name="file-text" size={14} />
                    {t("sources", { count: brief.source_count })}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#137fec] group-hover:text-[#0f6bca] transition-colors duration-150">
                    {t("readBrief")}
                    <Icon name="arrow-right" size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            message={t("relatedBriefsEmpty")}
            suggestion={t("relatedBriefsSuggestion")}
            action={{
              label: t("viewAllBriefs"),
              onClick: () => { window.location.href = "/briefs"; },
            }}
          />
        )}
      </section>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Loading Skeleton
   -------------------------------------------------------------------------- */
export function ProductDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      {/* Breadcrumbs skeleton */}
      <div className="flex items-center gap-2 mb-6">
        <div className="skeleton h-4 w-16 rounded" />
        <div className="skeleton h-4 w-4 rounded" />
        <div className="skeleton h-4 w-20 rounded" />
      </div>

      {/* Header skeleton */}
      <div className="space-y-6 mb-10">
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#283039]">
          <div className="flex items-start gap-6">
            <div className="skeleton size-24 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-3">
              <div className="skeleton h-8 w-48 rounded" />
              <div className="skeleton h-4 w-full max-w-md rounded" />
              <div className="skeleton h-4 w-40 rounded" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl border border-slate-200 dark:border-[#283039]">
              <div className="skeleton h-4 w-24 rounded mb-3" />
              <div className="skeleton h-8 w-20 rounded mb-2" />
              <div className="skeleton h-3 w-32 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div className="skeleton h-6 w-40 rounded" />
          <div className="flex gap-2">
            <div className="skeleton h-8 w-24 rounded-lg" />
            <div className="skeleton h-8 w-24 rounded-lg" />
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-5 rounded-2xl border border-slate-200 dark:border-[#283039]">
            <div className="flex items-center gap-3 mb-3">
              <div className="skeleton size-8 rounded-full" />
              <div className="skeleton h-4 w-40 rounded" />
            </div>
            <div className="skeleton h-5 w-3/4 rounded mb-2" />
            <div className="skeleton h-4 w-full rounded mb-1" />
            <div className="skeleton h-4 w-2/3 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
