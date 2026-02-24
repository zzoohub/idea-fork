"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/src/shared/i18n/navigation";
import { Icon } from "@/src/shared/ui/icon";
import { HeatBadge } from "./heat-badge";
import type { HeatLevel } from "@/src/shared/lib/compute-heat-level";
import { useCardHover } from "@/src/shared/lib/gsap";

interface SourcePlatform {
  name: string;
  color: string;
  letter: string;
}

interface BriefCardProps {
  title: string;
  heatLevel: HeatLevel;
  signalCount: number;
  communityCount: number;
  freshness: string | null;
  snippet: string;
  tags: string[];
  slug: string;
  sourcePlatforms?: SourcePlatform[];
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
  heatLevel,
  signalCount,
  communityCount,
  freshness,
  snippet,
  tags,
  slug,
  sourcePlatforms = [],
}: BriefCardProps) {
  const t = useTranslations("briefCard");
  const tCommon = useTranslations("common");
  const cardRef = useCardHover<HTMLElement>({ arrowSelector: "[data-arrow]" });

  return (
    <Link
      href={`/briefs/${slug}`}
      className="group no-underline"
    >
      <article
        ref={cardRef}
        className={[
          "flex flex-col h-full",
          "bg-white dark:bg-[#1c2127]",
          "rounded-xl",
          "border border-slate-200 dark:border-[#3b4754]",
          "p-5",
          "transition-colors duration-200",
        ].join(" ")}
      >
        {/* Row 1: Heat badge */}
        <div className="mb-3">
          <HeatBadge level={heatLevel} />
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
          {/* Sub-row 1: Meta info */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {sourcePlatforms.length > 0 && (
                <PlatformStack platforms={sourcePlatforms} />
              )}
              <span className="text-xs text-slate-500 dark:text-[#7a8a9a] tabular-nums">
                {t("complaints", { count: signalCount })}
              </span>
              <span className="text-xs text-slate-400 dark:text-[#5e6e7e]" aria-hidden="true">&middot;</span>
              <span className="text-xs text-slate-500 dark:text-[#7a8a9a]">
                {t("communities", { count: communityCount })}
              </span>
            </div>
            {freshness && (
              <span className="text-xs text-slate-400 dark:text-[#5e6e7e]">
                {tCommon("active", { time: freshness })}
              </span>
            )}
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
            <span className="inline-flex items-center gap-1 text-[#137fec] text-sm font-bold shrink-0">
              {t("readBrief")}
              <span data-arrow className="inline-flex">
                <Icon name="arrow-right" size={16} />
              </span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
