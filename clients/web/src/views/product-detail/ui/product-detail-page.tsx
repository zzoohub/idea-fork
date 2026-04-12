"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/src/shared/i18n/navigation";
import { Icon } from "@/src/shared/ui/icon";
import { Badge } from "@/src/shared/ui/badge";
import { Chip } from "@/src/shared/ui/chip";
import { EmptyState } from "@/src/shared/ui/empty-state";
import {
  ProductHeader,
  SignalSummary,
} from "@/src/entities/product/ui";
import { isSafeUrl } from "@/src/shared/lib/sanitize-url";
import type { ProductDetail, ProductPost } from "@/src/shared/api";
import { formatRelativeTime } from "@/src/shared/lib/format-relative-time";
import { useStaggerReveal, useScrollReveal } from "@/src/shared/lib/gsap";
import { POST_TYPE_LABEL_KEY } from "@/src/shared/lib/post-types";
import {
  SENTIMENT_BADGE,
  SORT_LABEL_KEY,
  getSourceConfig,
} from "./product-detail-utils";
import { useProductSignals } from "./use-product-signals";
import type { SortOption } from "./use-product-signals";

/* --------------------------------------------------------------------------
   Signal card
   -------------------------------------------------------------------------- */

interface SignalCardProps {
  post: ProductPost;
  isExpanded: boolean;
  onToggle: () => void;
  t: ReturnType<typeof useTranslations<"productDetail">>;
  tCommon: ReturnType<typeof useTranslations<"common">>;
}

function SignalCard({ post, isExpanded, onToggle, t, tCommon }: SignalCardProps) {
  const badge = post.sentiment ? SENTIMENT_BADGE[post.sentiment] : undefined;
  const srcCfg = getSourceConfig(post);

  return (
    <article
      className={[
        "group p-5 rounded-2xl cursor-pointer",
        "bg-white dark:bg-[#18212F]",
        "border border-slate-200 dark:border-border-dark",
        "hover:border-primary/50",
        "transition-all duration-200",
      ].join(" ")}
      onClick={onToggle}
    >
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 group-hover:text-primary transition-colors duration-150 mb-2">
        {post.title}
      </h3>

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
            {formatRelativeTime(post.external_created_at)}
          </time>
        </div>
        {badge && (
          <Badge variant={badge.variant}>
            {t(`sentiment.${badge.labelKey}`)}
          </Badge>
        )}
      </div>

      {post.body && (
        <p className={[
          "text-sm text-slate-500 dark:text-slate-400 leading-relaxed",
          isExpanded ? "" : "line-clamp-2",
        ].filter(Boolean).join(" ")}>
          {post.body}
        </p>
      )}

      <div className="flex items-center gap-5 mt-4 pt-3 border-t border-slate-100 dark:border-border-dark">
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Icon name="thumbs-up" size={14} />
          <span className="tabular-nums">{post.score.toLocaleString()}</span>
        </span>
        <span className="flex-1" />
        {isExpanded && isSafeUrl(post.external_url) && (
          <a
            href={post.external_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-[#0f6bca] transition-colors duration-150"
          >
            {tCommon("viewOriginal")}
            <Icon name="external-link" size={14} />
          </a>
        )}
      </div>
    </article>
  );
}

/* --------------------------------------------------------------------------
   ProductDetailPage
   -------------------------------------------------------------------------- */

interface ProductDetailPageProps {
  product: ProductDetail;
}

export function ProductDetailPage({ product }: ProductDetailPageProps) {
  const t = useTranslations("productDetail");
  const tCommon = useTranslations("common");
  const tA11y = useTranslations("accessibility");
  const tFeed = useTranslations("feed.postTypes");

  const signals = useProductSignals(product, (key) => tFeed(key as never));

  const headerRef = useStaggerReveal({ selector: "> *", stagger: 0.1 });
  const signalsRef = useScrollReveal({ selector: "> article" });
  const relatedRef = useScrollReveal();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      {/* Breadcrumbs */}
      <nav aria-label={tA11y("breadcrumb")} className="mb-6">
        <ol className="flex items-center gap-1.5 text-sm">
          <li>
            <Link
              href="/products"
              className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors duration-150 no-underline"
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

        <SignalSummary
          totalMentions={product.metrics?.total_mentions ?? product.signal_count}
          criticalSignals={product.metrics?.negative_count ?? product.posts.filter((p) => p.sentiment === "negative").length}
          frustrationRate={(() => {
            const total = product.metrics?.total_mentions ?? product.signal_count;
            const negative = product.metrics?.negative_count ?? product.posts.filter((p) => p.sentiment === "negative").length;
            return total > 0 ? Math.round((negative / total) * 100) : null;
          })()}
          themes={signals.themes}
        />
      </div>

      {/* Themes */}
      {signals.themes.length > 0 && (
        <section aria-labelledby="themes-heading" className="mb-8">
          <h2
            id="themes-heading"
            className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-3"
          >
            {t("signalThemes")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {signals.themes.map((theme) => (
              <Chip
                key={theme.type}
                variant={signals.activePostType === theme.type ? "active" : "inactive"}
                aria-pressed={signals.activePostType === theme.type}
                onClick={() => signals.togglePostType(theme.type)}
              >
                {theme.name} ({theme.count})
              </Chip>
            ))}
          </div>
        </section>
      )}

      {/* Signals feed */}
      <section aria-labelledby="complaints-heading">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h2
            id="complaints-heading"
            className="text-xl font-bold text-slate-900 dark:text-slate-50"
          >
            {t("userSignals")}
            <span className="ml-2 text-base font-normal text-slate-500 dark:text-slate-400">
              ({signals.sortedPosts.length})
            </span>
          </h2>

          <div className="flex items-center gap-2">
            {(["recent", "popular", "critical"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={signals.sortBy === option}
                className={[
                  "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  signals.sortBy === option
                    ? "bg-primary text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
                ].join(" ")}
                onClick={() => signals.setSortBy(option)}
              >
                {t(SORT_LABEL_KEY[option] as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>
        </div>

        {/* Filter chips */}
        {signals.availablePostTypes.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label={tA11y("filterByPostType")}>
            <Chip
              variant={signals.activePostType === null ? "active" : "inactive"}
              aria-pressed={signals.activePostType === null}
              onClick={() => signals.setActivePostType(null)}
            >
              {tFeed("all")}
            </Chip>
            {signals.availablePostTypes.map((pt) => (
              <Chip
                key={pt}
                variant={signals.activePostType === pt ? "active" : "inactive"}
                aria-pressed={signals.activePostType === pt}
                onClick={() => signals.togglePostType(pt)}
              >
                {tFeed((POST_TYPE_LABEL_KEY[pt] ?? pt) as never)}
              </Chip>
            ))}
          </div>
        )}

        {/* Signal cards */}
        {signals.sortedPosts.length === 0 ? (
          <EmptyState
            message={t("signalsEmpty")}
            suggestion={t("signalsEmptySuggestion")}
            action={signals.activePostType ? {
              label: tCommon("clearFilter"),
              onClick: () => signals.setActivePostType(null),
            } : {
              label: t("browseProducts"),
              onClick: () => { window.location.href = "/products"; },
            }}
          />
        ) : (
          <div ref={signalsRef} className="space-y-4">
            {signals.visibleSignals.map((post) => (
              <SignalCard
                key={post.id}
                post={post}
                isExpanded={signals.expandedIds.has(post.id)}
                onToggle={() => signals.toggleExpanded(post.id, post)}
                t={t}
                tCommon={tCommon}
              />
            ))}
          </div>
        )}

        {/* Show more / fewer */}
        {signals.sortedPosts.length > 0 && signals.remainingCount > 0 && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              className={[
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl",
                "text-sm font-semibold text-primary",
                "bg-[#137fec]/5 hover:bg-[#137fec]/10",
                "border border-[#137fec]/20",
                "transition-colors duration-150 cursor-pointer",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              ].join(" ")}
              onClick={() => signals.setShowAll((prev) => !prev)}
            >
              <Icon
                name={signals.showAll ? "chevron-up" : "chevron-down"}
                size={18}
              />
              {signals.showAll
                ? tCommon("showFewerSignals")
                : tCommon("showAllSignals", { count: signals.sortedPosts.length })}
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
                className="group block p-5 rounded-2xl bg-white dark:bg-[#18212F] border border-slate-200 dark:border-border-dark hover:border-primary/50 transition-all duration-200 no-underline"
              >
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 group-hover:text-primary transition-colors duration-150 line-clamp-2 mb-2">
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
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:text-[#0f6bca] transition-colors duration-150">
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

export { ProductDetailSkeleton } from "./product-detail-skeleton";
