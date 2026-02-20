import Link from "next/link";
import { Icon } from "@/src/shared/ui/icon";

interface SourcePlatform {
  name: string;
  color: string;
  letter: string;
}

interface BriefCardProps {
  title: string;
  postCount: number;
  platformCount: number;
  recency: string;
  snippet: string;
  tags: string[];
  slug: string;
  confidence?: "high" | "trending" | "emerging" | "new";
  sourcePlatforms?: SourcePlatform[];
}

const CONFIDENCE_STYLES = {
  high: {
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500 animate-pulse",
    label: "High Confidence",
    showDot: true,
  },
  trending: {
    badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    dot: "",
    label: "Trending",
    showDot: false,
  },
  emerging: {
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    dot: "",
    label: "Emerging",
    showDot: false,
  },
  new: {
    badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
    dot: "",
    label: "New",
    showDot: false,
  },
} as const;

function ConfidenceTag({
  confidence,
}: {
  confidence: "high" | "trending" | "emerging" | "new";
}) {
  const style = CONFIDENCE_STYLES[confidence];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}
      role="status"
      aria-label={style.label}
    >
      {style.showDot && (
        <span
          className={`inline-block size-1.5 rounded-full ${style.dot}`}
          aria-hidden="true"
        />
      )}
      {style.label}
    </span>
  );
}

function PlatformStack({
  platforms,
}: {
  platforms: SourcePlatform[];
}) {
  return (
    <div className="flex items-center" aria-label={`Sources: ${platforms.map((p) => p.name).join(", ")}`}>
      {platforms.map((platform, i) => (
        <span
          key={platform.name}
          className={`inline-flex items-center justify-center size-6 rounded-full ${platform.color} text-white text-[10px] font-bold ring-2 ring-white dark:ring-[#1c2127] ${i > 0 ? "-ml-1.5" : ""}`}
          aria-hidden="true"
        >
          {platform.letter}
        </span>
      ))}
    </div>
  );
}

export function BriefCard({
  title,
  postCount,
  platformCount,
  recency,
  snippet,
  tags,
  slug,
  confidence = "new",
  sourcePlatforms = [],
}: BriefCardProps) {
  return (
    <Link
      href={`/briefs/${slug}`}
      className="group no-underline"
    >
      <article
        className={[
          "flex flex-col h-full",
          "bg-white dark:bg-[#1c2127]",
          "rounded-xl",
          "border border-slate-200 dark:border-[#3b4754]",
          "p-5",
          "hover:border-[#137fec]/50 hover:shadow-lg hover:shadow-[#137fec]/10",
          "transition-all duration-300",
          "hover:-translate-y-1",
        ].join(" ")}
      >
        {/* Row 1: Confidence badge + Bookmark */}
        <div className="flex justify-between items-start mb-3">
          <ConfidenceTag confidence={confidence} />
          <button
            type="button"
            className="shrink-0 text-slate-400 hover:text-[#137fec] transition-colors p-0.5"
            aria-label="Bookmark this brief"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Icon name="bookmark" size={20} />
          </button>
        </div>

        {/* Row 2: Title */}
        <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-[#137fec] leading-tight mb-2 transition-colors">
          {title}
        </h3>

        {/* Row 3: Description */}
        <p className="text-slate-600 dark:text-[#9dabb9] text-sm line-clamp-3 mb-6">
          {snippet}
        </p>

        {/* Row 4: Footer */}
        <div className="mt-auto border-t border-slate-200 dark:border-[#283039] pt-4 flex flex-col gap-4">
          {/* Sub-row 1: Platforms + time */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {sourcePlatforms.length > 0 && (
                <PlatformStack platforms={sourcePlatforms} />
              )}
              <span className="text-xs text-slate-500 dark:text-[#7a8a9a] tabular-nums">
                {postCount.toLocaleString()} related posts
              </span>
            </div>
            <span className="text-xs text-slate-400 dark:text-[#5e6e7e]">
              {recency}
            </span>
          </div>

          {/* Sub-row 2: Tags + Read Brief */}
          <div className="flex justify-between items-center">
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded border border-slate-200 dark:border-[#3b4754] text-xs text-slate-600 dark:text-[#9dabb9]"
                >
                  {tag}
                </span>
              ))}
            </div>
            <span className="inline-flex items-center gap-1 text-[#137fec] text-sm font-bold shrink-0 transition-all group-hover:gap-2">
              Read Brief
              <Icon name="arrow-right" size={16} />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
