export type Platform = "reddit" | "producthunt" | "playstore" | "appstore" | "github";

export type TagType =
  | "complaint"
  | "need"
  | "feature-request"
  | "discussion"
  | "self-promo"
  | "other";

export type TrendDirection = "growing" | "stable" | "declining";

export type FeedSortMode = "trending" | "recent";
export type BriefSortMode = "evidence" | "recent" | "trending";
export type ProductSortMode = "complaints" | "trending" | "recent";

export interface FeedPost {
  id: string;
  platform: Platform;
  platformSubSource: string;
  title: string;
  excerpt: string;
  tag: TagType;
  sourceUrl: string;
  upvotes: number;
  comments: number;
  helpfulVotes?: number;
  createdAt: string;
  relatedBriefId?: string;
}

export interface Brief {
  id: string;
  title: string;
  summary: string;
  postCount: number;
  platforms: Platform[];
  recencyLabel: string;
  tags: string[];
}

export interface BriefSection {
  heading: string;
  body: string;
}

export interface BriefDetail {
  id: string;
  title: string;
  postCount: number;
  platforms: Platform[];
  recencyLabel: string;
  tags: string[];
  sections: BriefSection[];
  suggestedDirections: string[];
  sourceEvidence: SourcePost[];
  relatedBriefs: RelatedBrief[];
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

export interface RelatedBrief {
  id: string;
  title: string;
  postCount: number;
}

export interface ComplaintTheme {
  theme: string;
  postCount: number;
  posts: SourcePost[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  platforms: Platform[];
  category: string;
  complaintCount: number;
  topIssue: string;
  tags: string[];
  trendingIndicator?: boolean;
  websiteUrl?: string;
}

export interface ProductDetail extends Product {
  complaintBreakdown: ComplaintTheme[];
  relatedBriefs: RelatedBrief[];
}
