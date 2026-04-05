import type { ProductPost } from "@/src/shared/api";
import { POST_TYPE_LABEL_KEY } from "@/src/shared/lib/post-types";

/* --------------------------------------------------------------------------
   Computed themes — aggregate post_type breakdown
   -------------------------------------------------------------------------- */

export interface ComputedTheme {
  type: string;
  name: string;
  count: number;
}

export function computeThemes(
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
   Sentiment badges + severity ordering
   -------------------------------------------------------------------------- */

export const SENTIMENT_BADGE: Record<
  string,
  { labelKey: "frustrated"; variant: "frustrated" }
> = {
  negative: { labelKey: "frustrated", variant: "frustrated" },
};

const SEVERITY_ORDER: Record<string, number> = {
  negative: 0,
  complaint: 1,
  need: 1,
  feature_request: 2,
  alternative_seeking: 2,
  question: 3,
};

export function getSeverity(post: ProductPost): number {
  return (
    SEVERITY_ORDER[post.sentiment ?? ""] ??
    SEVERITY_ORDER[post.post_type ?? ""] ??
    99
  );
}

/* --------------------------------------------------------------------------
   Source platform config
   -------------------------------------------------------------------------- */

export function getSourceConfig(post: ProductPost) {
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
  return {
    label: post.source,
    color: "bg-slate-500",
    icon: post.source[0] ?? "?",
  };
}
