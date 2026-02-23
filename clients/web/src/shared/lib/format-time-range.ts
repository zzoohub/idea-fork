const DAY_MS = 86_400_000;

export function formatTimeRange(
  oldestAt: string | null,
  newestAt: string | null,
): string | null {
  if (!oldestAt || !newestAt) return null;

  const oldest = new Date(oldestAt).getTime();
  const newest = new Date(newestAt).getTime();

  if (Number.isNaN(oldest) || Number.isNaN(newest)) return null;

  const diffDays = Math.max(1, Math.round(Math.abs(newest - oldest) / DAY_MS));

  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"}`;

  const weeks = Math.round(diffDays / 7);
  if (weeks < 9) return `${weeks} week${weeks === 1 ? "" : "s"}`;

  const months = Math.round(diffDays / 30);
  if (months < 12) return `${months} months`;

  const years = Math.round(diffDays / 365);
  return `${years} year${years === 1 ? "" : "s"}`;
}
