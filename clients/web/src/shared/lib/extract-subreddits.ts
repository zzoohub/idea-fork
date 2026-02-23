export function extractSubreddits(
  sourceSnapshots: Record<string, unknown>[],
): string[] {
  const seen = new Set<string>();

  for (const snap of sourceSnapshots) {
    const subreddit = snap.subreddit;
    if (typeof subreddit === "string" && subreddit !== "") {
      seen.add(subreddit);
    }
  }

  return Array.from(seen);
}
