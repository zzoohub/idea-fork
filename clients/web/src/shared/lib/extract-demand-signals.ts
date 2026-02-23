export interface ParsedDemandSignals {
  postCount: number;
  subredditCount: number;
  avgScore: number;
  totalComments: number;
  newestPostAt: string | null;
  oldestPostAt: string | null;
}

export function extractDemandSignals(
  raw: Record<string, unknown>,
): ParsedDemandSignals {
  return {
    postCount: toNumber(raw.post_count),
    subredditCount: toNumber(raw.subreddit_count),
    avgScore: toNumber(raw.avg_score),
    totalComments: toNumber(raw.total_comments),
    newestPostAt: toDateString(raw.newest_post_at),
    oldestPostAt: toDateString(raw.oldest_post_at),
  };
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
}

function toDateString(value: unknown): string | null {
  if (typeof value !== "string" || value === "") return null;
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return null;
  return new Date(ts).toISOString();
}
