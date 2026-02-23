import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/src/shared/i18n/navigation";
import { Icon } from "@/src/shared/ui/icon";
import { HeatBadge } from "@/src/entities/brief/ui/heat-badge";
import type { HeatLevel } from "@/src/shared/lib/compute-heat-level";
import { formatSource } from "@/src/shared/lib/format-source";
import type { Tag } from "@/src/shared/api/types";

interface ProductCardProps {
  name: string;
  slug: string;
  iconUrl?: string;
  iconBg?: string;
  productUrl?: string;
  category: string;
  heatLevel: HeatLevel;
  signalCount: number;
  tagline: string;
  source?: string;
  sources?: string[];
  tags: Tag[];
}

export function ProductCard({
  name,
  slug,
  iconUrl,
  iconBg,
  productUrl,
  category,
  heatLevel,
  signalCount,
  tagline,
  source,
  sources,
  tags,
}: ProductCardProps) {
  const t = useTranslations("productCard");

  return (
    <Link
      href={`/products/${slug}`}
      className="group flex flex-col h-full rounded-xl border border-slate-200 dark:border-[#2d3b4a] bg-white dark:bg-[#1c242e] p-5 no-underline transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Row 1: Icon + Name/Category + HeatBadge */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <ProductIcon name={name} iconUrl={iconUrl} iconBg={iconBg} productUrl={productUrl} />
          <div className="min-w-0">
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 group-hover:text-primary truncate transition-colors">
              {name}
            </h3>
            <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {category}
            </span>
          </div>
        </div>

        <HeatBadge level={heatLevel} />
      </div>

      {/* Row 2: Tagline */}
      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
        {tagline}
      </p>

      {/* Row 3: Signal count + Source + Tags */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums">
          <Icon name="zap" size={14} />
          {t("signals", { count: signalCount.toLocaleString() })}
        </span>

        {(sources && sources.length > 0 ? sources : source ? [source] : []).map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/20 rounded-full px-2.5 py-1 text-xs font-medium"
          >
            <Icon name="globe" size={12} />
            {formatSource(s)}
          </span>
        ))}

        {tags.map((tag) => (
          <span
            key={tag.slug}
            className="px-2 py-0.5 rounded border border-slate-200 dark:border-[#3b4754] text-xs text-slate-600 dark:text-[#9dabb9]"
          >
            {tag.name}
          </span>
        ))}
      </div>

      {/* Row 4: Explore Gaps CTA */}
      <div className="flex items-center gap-1 mt-auto">
        <span className="text-primary font-bold text-sm group-hover:underline">
          {t("exploreGaps")}
        </span>
        <Icon
          name="arrow-right"
          size={16}
          className="text-primary transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}

/* ---------------------------------------------------------------------------
   ProductIcon - Image → favicon fallback → letter avatar
   --------------------------------------------------------------------------- */
function getDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function ProductIcon({
  name,
  iconUrl,
  iconBg,
  productUrl,
}: {
  name: string;
  iconUrl?: string;
  iconBg?: string;
  productUrl?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const domain = productUrl ? getDomain(productUrl) : null;
  const faviconUrl = domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    : null;

  const resolvedSrc = iconUrl ?? faviconUrl;

  if (resolvedSrc && !imgFailed) {
    return (
      <img
        src={resolvedSrc}
        alt=""
        width={48}
        height={48}
        className="size-12 shrink-0 rounded-lg object-cover"
        onError={() => setImgFailed(true)}
      />
    );
  }

  const defaultBg = "bg-gradient-to-br from-primary to-blue-400";

  return (
    <div
      className={`flex size-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white ${iconBg ?? defaultBg}`}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
