export type Platform = "reddit" | "producthunt" | "playstore" | "appstore" | "github";

export type TagType =
  | "complaint"
  | "need"
  | "feature-request"
  | "discussion"
  | "self-promo"
  | "other";

export type UserTier = "anonymous" | "free" | "pro";

export type TrendDirection = "growing" | "stable" | "declining";

export interface FeedPost {
  id: string;
  platform: Platform;
  platformSubSource: string; // e.g., "r/SaaS", "Google Play"
  title: string;
  excerpt: string;
  tag: TagType;
  sourceUrl: string;
  upvotes: number;
  comments: number;
  helpfulVotes?: number;
  createdAt: string; // ISO timestamp
  needId?: string;
  isBookmarked: boolean;
}

export interface Brief {
  id: string;
  title: string;
  summary: string;
  postCount: number;
  platforms: Platform[];
  opportunityScore: number; // 0-10
  cycleId: string;
  cycleDate: string;
  isBookmarked: boolean;
}

export interface BriefDetail {
  id: string;
  title: string;
  cycleDate: string;
  problemSummary: string;
  sourceEvidence: SourcePost[];
  volume: number;
  intensity: "low" | "medium" | "high";
  trend: TrendDirection;
  sparklineData: number[];
  alternatives: Alternative[];
  opportunitySignal: string;
  opportunityScore: number;
  relatedNeeds: RelatedNeed[];
  isBookmarked: boolean;
}

export interface SourcePost {
  id: string;
  platform: Platform;
  excerpt: string;
  platformSubSource: string;
  sourceUrl: string;
  upvotes?: number;
  helpfulVotes?: number;
  createdAt: string;
}

export interface Alternative {
  name: string;
  sentiment: string;
  mentionCount: number;
}

export interface RelatedNeed {
  id: string;
  title: string;
  postCount: number;
}

export interface NeedDetail {
  id: string;
  title: string;
  tag: TagType;
  frequency: number;
  intensity: number; // 0-5
  trend: TrendDirection;
  sparklineData: number[];
  sourcePosts: SourcePost[];
  totalSourcePosts: number;
  relatedClusters: RelatedNeed[];
  relatedBrief?: {
    id: string;
    title: string;
    opportunityScore: number;
  };
  isBookmarked: boolean;
}

export interface Bookmark {
  id: string;
  type: "feed" | "brief";
  itemId: string;
  createdAt: string;
  item: FeedPost | Brief;
}

export interface TrackedKeyword {
  id: string;
  keyword: string;
  createdAt: string;
  matchCount: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  tier: UserTier;
  memberSince: string;
  weeklyDigest: boolean;
  nextBillingDate?: string;
}

export interface Cycle {
  id: string;
  date: string;
  briefCount: number;
  postCount: number;
}

export interface TrendingKeyword {
  keyword: string;
  platform: Platform;
}
