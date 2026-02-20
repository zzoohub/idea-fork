import Link from "next/link";
import { MaterialIcon } from "@/src/shared/ui/material-icon";

interface ProductCardProps {
  name: string;
  slug: string;
  iconUrl?: string;
  iconBg?: string;
  category: string;
  trendPercent?: number;
  trendLabel?: string;
  complaintCount: number;
  topFrustration: string;
  tags: string[];
}

export function ProductCard({
  name,
  slug,
  iconUrl,
  iconBg,
  category,
  trendPercent,
  trendLabel,
  complaintCount,
  topFrustration,
  tags,
}: ProductCardProps) {
  return (
    <Link
      href={`/products/${slug}`}
      className="group flex flex-col h-full rounded-xl border border-slate-200 dark:border-[#2d3b4a] bg-white dark:bg-[#1c242e] p-5 no-underline transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Row 1: Icon + Name + Trend badge */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <ProductIcon name={name} iconUrl={iconUrl} iconBg={iconBg} />
          <div className="min-w-0">
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 group-hover:text-primary truncate transition-colors">
              {name}
            </h3>
            <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {category}
            </span>
          </div>
        </div>

        <TrendBadge trendPercent={trendPercent} trendLabel={trendLabel} />
      </div>

      {/* Row 2: Avatar stack + complaint count */}
      <div className="flex items-center gap-2 mb-4">
        <AvatarStack />
        <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums">
          <MaterialIcon name="feedback" size={14} />
          {complaintCount.toLocaleString()} complaints
        </span>
      </div>

      {/* Row 3: Top Frustration */}
      <div className="bg-slate-50 dark:bg-[#232b36] rounded-lg p-3 mb-4 flex-1">
        <div className="flex items-center gap-1.5 mb-1.5">
          <MaterialIcon
            name="warning"
            size={14}
            filled
            className="text-orange-500"
          />
          <span className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Top Frustration
          </span>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
          &ldquo;{topFrustration}&rdquo;
        </p>
      </div>

      {/* Row 4: View Details link */}
      <div className="flex items-center gap-1 mt-auto">
        <span className="text-primary font-bold text-sm group-hover:underline">
          View Details
        </span>
        <MaterialIcon
          name="arrow_forward"
          size={16}
          className="text-primary transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}

/* ---------------------------------------------------------------------------
   ProductIcon - Image or letter avatar
   --------------------------------------------------------------------------- */
function ProductIcon({
  name,
  iconUrl,
  iconBg,
}: {
  name: string;
  iconUrl?: string;
  iconBg?: string;
}) {
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        width={48}
        height={48}
        className="size-12 shrink-0 rounded-lg object-cover"
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

/* ---------------------------------------------------------------------------
   TrendBadge
   --------------------------------------------------------------------------- */
function TrendBadge({
  trendPercent,
  trendLabel,
}: {
  trendPercent?: number;
  trendLabel?: string;
}) {
  // "Hot" label
  if (trendLabel === "Hot") {
    return (
      <span className="inline-flex items-center gap-1 text-red-500 bg-red-500/10 rounded-full px-2 py-0.5 text-xs font-semibold shrink-0">
        <MaterialIcon name="local_fire_department" size={14} filled />
        Hot
      </span>
    );
  }

  // "Stable" label
  if (trendLabel === "Stable") {
    return (
      <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 dark:bg-[#283039] rounded-full px-2 py-0.5 text-xs font-semibold shrink-0">
        Stable
      </span>
    );
  }

  // Positive trend percent
  if (trendPercent != null && trendPercent > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-500 bg-emerald-500/10 rounded-full px-2 py-0.5 text-xs font-semibold shrink-0">
        <MaterialIcon name="trending_up" size={14} />
        +{trendPercent}%
      </span>
    );
  }

  // Negative trend percent
  if (trendPercent != null && trendPercent < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-red-500 bg-red-500/10 rounded-full px-2 py-0.5 text-xs font-semibold shrink-0">
        <MaterialIcon name="trending_down" size={14} />
        {trendPercent}%
      </span>
    );
  }

  return null;
}

/* ---------------------------------------------------------------------------
   AvatarStack - Placeholder overlapping circles
   --------------------------------------------------------------------------- */
const AVATAR_COLORS = [
  "bg-blue-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-purple-400",
];

function AvatarStack() {
  return (
    <div className="flex -space-x-1.5" aria-hidden="true">
      {AVATAR_COLORS.map((color, i) => (
        <div
          key={i}
          className={`size-6 rounded-full border-2 border-white dark:border-[#1c242e] ${color}`}
        />
      ))}
    </div>
  );
}
