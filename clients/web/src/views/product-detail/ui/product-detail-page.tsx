"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/src/shared/i18n/navigation";
import { Icon } from "@/src/shared/ui/icon";
import { Badge } from "@/src/shared/ui/badge";
import { ErrorState } from "@/src/shared/ui/error-state";
import { EmptyState } from "@/src/shared/ui/empty-state";
import {
  ProductHeader,
  ComplaintSummary,
} from "@/src/entities/product/ui";
import { isSafeUrl } from "@/src/shared/lib/sanitize-url";
import { fetchProduct } from "@/src/entities/product/api";
import type { ProductDetail, ProductPost, RelatedBrief } from "@/src/shared/api";
import { formatRelativeTime } from "@/src/shared/lib/format-relative-time";

const INITIAL_VISIBLE_COUNT = 4;

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

function computeThemes(
  posts: ProductPost[],
  getLabel: (key: string) => string,
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    const pt = post.post_type;
    if (!pt) continue;
    counts.set(pt, (counts.get(pt) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      name: getLabel(POST_TYPE_LABEL_KEY[type] ?? type),
      count,
    }));
}

/* --------------------------------------------------------------------------
   Sentiment config
   -------------------------------------------------------------------------- */
type SentimentLabelKey = "frustrated" | "featureRequest" | "question" | "bugReport";

const SENTIMENT_VARIANT: Record<
  string,
  { labelKey: SentimentLabelKey; variant: "frustrated" | "request" | "question" | "bug_report" }
> = {
  frustrated: { labelKey: "frustrated", variant: "frustrated" },
  negative: { labelKey: "frustrated", variant: "frustrated" },
  request: { labelKey: "featureRequest", variant: "request" },
  feature_request: { labelKey: "featureRequest", variant: "request" },
  question: { labelKey: "question", variant: "question" },
  bug_report: { labelKey: "bugReport", variant: "bug_report" },
  bug: { labelKey: "bugReport", variant: "bug_report" },
};

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
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");
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

  if (loading) return <ProductDetailSkeleton />;
  if (error || !product) return <ErrorState message={error ?? t("errors.notFound")} onRetry={() => window.location.reload()} />;

  const sortedPosts = [...product.posts].sort((a, b) => {
    if (sortBy === "popular") return b.score - a.score;
    return new Date(b.external_created_at).getTime() - new Date(a.external_created_at).getTime();
  });

  const visibleComplaints = showAllComplaints
    ? sortedPosts
    : sortedPosts.slice(0, INITIAL_VISIBLE_COUNT);

  const remainingCount = sortedPosts.length - INITIAL_VISIBLE_COUNT;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
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
      <div className="space-y-6 mb-10">
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
          criticalComplaints={product.metrics?.negative_count ?? product.posts.filter((p) => p.sentiment === "negative" || p.sentiment === "frustrated").length}
          frustrationRate={(() => {
            const total = product.metrics?.total_mentions ?? product.complaint_count;
            const negative = product.metrics?.negative_count ?? product.posts.filter((p) => p.sentiment === "negative" || p.sentiment === "frustrated").length;
            return total > 0 ? Math.round((negative / total) * 100) : null;
          })()}
          themes={computeThemes(product.posts, (key) => tFeed(key as never))}
        />
      </div>

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
            <button
              type="button"
              className={[
                "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#137fec]",
                sortBy === "recent"
                  ? "bg-[#137fec] text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
              ].join(" ")}
              onClick={() => setSortBy("recent")}
            >
              {t("sortRecent")}
            </button>
            <button
              type="button"
              className={[
                "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#137fec]",
                sortBy === "popular"
                  ? "bg-[#137fec] text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
              ].join(" ")}
              onClick={() => setSortBy("popular")}
            >
              {t("sortPopular")}
            </button>
          </div>
        </div>

        {/* Complaint cards */}
        <div className="space-y-4">
          {visibleComplaints.map((complaint) => {
            const sentimentCfg = complaint.sentiment
              ? SENTIMENT_VARIANT[complaint.sentiment]
              : undefined;
            const srcCfg = getSourceConfig(complaint);
            return (
              <article
                key={complaint.id}
                className={[
                  "group p-5 rounded-2xl",
                  "bg-white dark:bg-[#18212F]",
                  "border border-slate-200 dark:border-[#283039]",
                  "hover:border-[#137fec]/50",
                  "transition-all duration-200",
                ].join(" ")}
              >
                {/* Top row: source + time + sentiment */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={[
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                      srcCfg.color,
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    {srcCfg.icon}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      in {srcCfg.label}
                    </span>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                      &middot;
                    </span>
                    <time className="text-xs text-slate-400 dark:text-slate-500">
                      {formatRelativeTime(complaint.external_created_at)}
                    </time>
                  </div>
                  {sentimentCfg && (
                    <Badge variant={sentimentCfg.variant}>
                      {t(`sentiment.${sentimentCfg.labelKey}`)}
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 group-hover:text-[#137fec] transition-colors duration-150 mb-1.5">
                  {complaint.title}
                </h3>

                {/* Description */}
                {complaint.body && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
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
                  {isSafeUrl(complaint.external_url) ? (
                    <a
                      href={complaint.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#137fec] hover:text-[#0f6bca] transition-colors duration-150"
                    >
                      {tCommon("viewOriginal")}
                      <Icon name="external-link" size={14} />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {tCommon("viewOriginal")}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* Show more / fewer */}
        {remainingCount > 0 && (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
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
