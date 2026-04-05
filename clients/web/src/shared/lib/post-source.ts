/**
 * Shared source-mapping utilities for post cards and listings.
 *
 * Consolidates duplicated mapSource/mapSourceName from feed-page,
 * search-results-page, and brief-detail-page.
 */

export type PostSource = "reddit" | "twitter" | "linkedin" | "appstore";

export interface SourcedPost {
  source: string;
  subreddit?: string | null;
}

/** Normalise a raw source string to a PostSource union for avatar rendering. */
export function mapSource(source: string): PostSource {
  const s = source.toLowerCase();
  if (s === "reddit") return "reddit";
  if (s === "twitter" || s === "x") return "twitter";
  if (s === "linkedin") return "linkedin";
  if (
    s === "appstore" ||
    s === "app_store" ||
    s === "playstore" ||
    s === "play_store" ||
    s === "google_play"
  )
    return "appstore";
  return "reddit";
}

/** Human-readable display name for the source (e.g. "r/webdev", "App Store"). */
export function mapSourceName(post: SourcedPost): string {
  if (post.subreddit) return `r/${post.subreddit}`;
  const s = post.source.toLowerCase();
  if (s === "twitter" || s === "x") return "Twitter / X";
  if (s === "linkedin") return "LinkedIn";
  if (s === "appstore" || s === "app_store") return "App Store";
  if (s === "playstore" || s === "play_store" || s === "google_play")
    return "Google Play";
  return post.source;
}
