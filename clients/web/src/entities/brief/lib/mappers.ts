import type { BriefListItem } from "@/src/shared/api";
import type { HeatLevel } from "@/src/shared/lib/compute-heat-level";
import { extractDemandSignals } from "@/src/shared/lib/extract-demand-signals";
import { computeHeatLevel } from "@/src/shared/lib/compute-heat-level";
import { formatRelativeTime } from "@/src/shared/lib/format-relative-time";

export interface BriefCardData {
  title: string;
  heatLevel: HeatLevel;
  signalCount: number;
  communityCount: number;
  freshness: string | null;
  snippet: string;
  tags: string[];
  slug: string;
}

export function mapBriefToCardData(brief: BriefListItem): BriefCardData {
  const parsed = extractDemandSignals(brief.demand_signals);
  const heatLevel = computeHeatLevel({
    postCount: parsed.postCount,
    newestPostAt: parsed.newestPostAt,
  });
  const freshness = parsed.newestPostAt
    ? formatRelativeTime(parsed.newestPostAt)
    : null;

  return {
    title: brief.title,
    heatLevel,
    signalCount: parsed.postCount || brief.source_count,
    communityCount: parsed.subredditCount || 1,
    freshness,
    snippet: brief.summary,
    tags: [],
    slug: brief.slug,
  };
}
