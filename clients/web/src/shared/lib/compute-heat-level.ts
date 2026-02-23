export type HeatLevel = "hot" | "growing" | "steady" | "new";

const DAY_MS = 86_400_000;

export function computeHeatLevel(params: {
  postCount: number;
  newestPostAt: string | null;
}): HeatLevel {
  const { postCount, newestPostAt } = params;
  const daysSinceNewest = newestPostAt
    ? (Date.now() - new Date(newestPostAt).getTime()) / DAY_MS
    : Infinity;

  if (postCount >= 20 && daysSinceNewest <= 3) return "hot";
  if (postCount >= 10 && daysSinceNewest <= 7) return "growing";
  if (postCount >= 5) return "steady";
  return "new";
}
