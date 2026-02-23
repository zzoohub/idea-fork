/* --------------------------------------------------------------------------
   API Envelope
   -------------------------------------------------------------------------- */

export interface ApiResponse<T> {
  data: T;
  meta?: { has_next: boolean; next_cursor: string | null };
}

/* --------------------------------------------------------------------------
   Tags
   -------------------------------------------------------------------------- */

export interface Tag {
  id: number;
  slug: string;
  name: string;
}

/* --------------------------------------------------------------------------
   Posts
   -------------------------------------------------------------------------- */

export interface PostTag {
  slug: string;
  name: string;
}

export interface Post {
  id: number;
  title: string;
  body: string | null;
  source: string;
  subreddit: string | null;
  external_url: string;
  external_created_at: string;
  score: number;
  num_comments: number;
  post_type: string | null;
  sentiment: string | null;
  tags: PostTag[];
}

/* --------------------------------------------------------------------------
   Briefs
   -------------------------------------------------------------------------- */

export interface BriefListItem {
  id: number;
  slug: string;
  title: string;
  summary: string;
  status: string;
  published_at: string | null;
  source_count: number;
  upvote_count: number;
  downvote_count: number;
  demand_signals: Record<string, unknown>;
}

export interface BriefDetail extends BriefListItem {
  problem_statement: string;
  opportunity: string;
  solution_directions: string[];
  source_snapshots: Record<string, unknown>[];
}

/* --------------------------------------------------------------------------
   Products
   -------------------------------------------------------------------------- */

export interface ProductListItem {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  tagline: string | null;
  url: string | null;
  image_url: string | null;
  category: string | null;
  source: string | null;
  sources: string[];
  launched_at: string | null;
  complaint_count: number;
  trending_score: number;
  tags: Tag[];
}

export interface ProductPost {
  id: number;
  title: string;
  body: string | null;
  source: string;
  subreddit: string | null;
  external_url: string;
  external_created_at: string;
  score: number;
  post_type: string | null;
  sentiment: string | null;
}

export interface ProductMetrics {
  total_mentions: number;
  negative_count: number;
  sentiment_score: number;
}

export interface RelatedBrief {
  id: number;
  slug: string;
  title: string;
  summary: string;
  source_count: number;
}

export interface ProductDetail extends ProductListItem {
  metrics: ProductMetrics;
  posts: ProductPost[];
  related_briefs: RelatedBrief[];
}

/* --------------------------------------------------------------------------
   Ratings
   -------------------------------------------------------------------------- */

export interface Rating {
  id: number;
  brief_id: number;
  is_positive: boolean;
  feedback: string | null;
  created_at: string;
}
