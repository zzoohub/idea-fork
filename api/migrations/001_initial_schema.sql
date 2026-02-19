-- idea-fork: Initial Schema Migration
-- Date: 2026-02-20
-- Database: Neon PostgreSQL + pgvector
-- Requires: pgvector extension

-- ============================================================
-- Extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- Enum Types
-- ============================================================

CREATE TYPE post_source AS ENUM (
    'reddit',
    'product_hunt',
    'play_store',
    'app_store',
    'github'
);
COMMENT ON TYPE post_source IS 'Platform from which a post was fetched';

CREATE TYPE post_tag AS ENUM (
    'complaint',
    'need',
    'feature_request',
    'discussion',
    'self_promo',
    'other'
);
COMMENT ON TYPE post_tag IS 'LLM-assigned category for a post';

CREATE TYPE user_tier AS ENUM (
    'free',
    'pro'
);
COMMENT ON TYPE user_tier IS 'User subscription tier';

CREATE TYPE pipeline_status AS ENUM (
    'running',
    'completed',
    'failed',
    'partial'
);
COMMENT ON TYPE pipeline_status IS 'Pipeline cycle execution status';

CREATE TYPE keyword_type AS ENUM (
    'keyword',
    'domain'
);
COMMENT ON TYPE keyword_type IS 'Type of tracked keyword';

-- ============================================================
-- Tables
-- ============================================================

-- ----------------------------------------------------------
-- pipeline_cycle: Tracks each pipeline execution
-- ----------------------------------------------------------
CREATE TABLE pipeline_cycle (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    post_count      INTEGER NOT NULL DEFAULT 0,
    cluster_count   INTEGER NOT NULL DEFAULT 0,
    brief_count     INTEGER NOT NULL DEFAULT 0,
    status          pipeline_status NOT NULL DEFAULT 'running',
    error_log       TEXT
);
COMMENT ON TABLE pipeline_cycle IS 'Metadata for each pipeline execution cycle';
COMMENT ON COLUMN pipeline_cycle.started_at IS 'When the pipeline cycle began execution';
COMMENT ON COLUMN pipeline_cycle.completed_at IS 'When the pipeline cycle finished (NULL if still running)';
COMMENT ON COLUMN pipeline_cycle.error_log IS 'Error details if status is failed or partial';

-- ----------------------------------------------------------
-- post: Tagged posts from all data sources
-- ----------------------------------------------------------
CREATE TABLE post (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cycle_id        BIGINT NOT NULL REFERENCES pipeline_cycle (id),
    published_at    TIMESTAMPTZ,
    archived_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    embedding       vector(1536),
    engagement_score INTEGER NOT NULL DEFAULT 0,
    source          post_source NOT NULL,
    source_id       TEXT NOT NULL,
    tag             post_tag NOT NULL DEFAULT 'other',
    title           TEXT NOT NULL,
    body            TEXT,
    source_url      TEXT NOT NULL,
    source_metadata JSONB NOT NULL DEFAULT '{}'
);
COMMENT ON TABLE post IS 'Posts fetched from data sources, tagged by LLM, with embeddings';
COMMENT ON COLUMN post.cycle_id IS 'Pipeline cycle that produced this post';
COMMENT ON COLUMN post.source_id IS 'Unique identifier from the source platform (e.g., Reddit post ID)';
COMMENT ON COLUMN post.tag IS 'LLM-assigned category';
COMMENT ON COLUMN post.embedding IS '1536-dim vector from text-embedding-3-small';
COMMENT ON COLUMN post.engagement_score IS 'Normalized cross-platform engagement score (higher = more engagement)';
COMMENT ON COLUMN post.archived_at IS 'Set when post is older than 90 days; excluded from feed, retained for brief evidence';
COMMENT ON COLUMN post.source_metadata IS 'Platform-specific fields (e.g., Reddit: subreddit, upvotes; GitHub: star_count, language)';

-- Unique constraint for pipeline idempotency (upsert on conflict)
CREATE UNIQUE INDEX uq_post_source_source_id ON post (source, source_id);

-- Feed query: filter by tag + sort by engagement + cursor pagination
CREATE INDEX idx_post_feed ON post (tag, engagement_score DESC, id DESC)
    WHERE archived_at IS NULL;

-- Feed query: sort by published time
CREATE INDEX idx_post_published ON post (published_at DESC, id DESC)
    WHERE archived_at IS NULL;

-- FK index: cycle_id
CREATE INDEX idx_post_cycle_id ON post (cycle_id);

-- Vector similarity: HNSW index for clustering and related-post search
CREATE INDEX idx_post_embedding_hnsw ON post
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
    WHERE archived_at IS NULL;

-- ----------------------------------------------------------
-- need_cluster: Clusters of similar needs per cycle
-- ----------------------------------------------------------
CREATE TABLE need_cluster (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cycle_id        BIGINT NOT NULL REFERENCES pipeline_cycle (id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    centroid        vector(1536),
    rank_score      NUMERIC(10, 4) NOT NULL DEFAULT 0,
    avg_intensity   NUMERIC(5, 2) NOT NULL DEFAULT 0,
    competitive_gap NUMERIC(5, 2) NOT NULL DEFAULT 0,
    post_count      INTEGER NOT NULL DEFAULT 0,
    title           TEXT NOT NULL,
    description     TEXT,
    trend_direction TEXT NOT NULL DEFAULT 'stable'
        CHECK (trend_direction IN ('growing', 'stable', 'declining'))
);
COMMENT ON TABLE need_cluster IS 'Clusters of similar user needs, produced by HDBSCAN each cycle';
COMMENT ON COLUMN need_cluster.centroid IS 'Average embedding vector of cluster member posts';
COMMENT ON COLUMN need_cluster.rank_score IS 'Composite score: volume x intensity x competitive_gap';
COMMENT ON COLUMN need_cluster.avg_intensity IS 'Average sentiment strength across cluster posts';
COMMENT ON COLUMN need_cluster.competitive_gap IS 'How underserved this need is by existing products (0-10)';

-- Query: clusters by cycle, ordered by rank
CREATE INDEX idx_need_cluster_cycle_rank ON need_cluster (cycle_id DESC, rank_score DESC);

-- ----------------------------------------------------------
-- cluster_post: M2M junction between clusters and posts
-- ----------------------------------------------------------
CREATE TABLE cluster_post (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cluster_id      BIGINT NOT NULL REFERENCES need_cluster (id) ON DELETE CASCADE,
    post_id         BIGINT NOT NULL REFERENCES post (id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    similarity_score NUMERIC(5, 4) NOT NULL DEFAULT 0
);
COMMENT ON TABLE cluster_post IS 'Maps posts to need clusters with similarity scores';

-- Prevent duplicate assignments within the same cluster
CREATE UNIQUE INDEX uq_cluster_post ON cluster_post (cluster_id, post_id);

-- FK indexes
CREATE INDEX idx_cluster_post_cluster ON cluster_post (cluster_id);
CREATE INDEX idx_cluster_post_post ON cluster_post (post_id);

-- ----------------------------------------------------------
-- brief: AI-generated product briefs from top clusters
-- ----------------------------------------------------------
CREATE TABLE brief (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cycle_id        BIGINT NOT NULL REFERENCES pipeline_cycle (id),
    cluster_id      BIGINT NOT NULL REFERENCES need_cluster (id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    opportunity_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    intensity       NUMERIC(5, 2) NOT NULL DEFAULT 0,
    volume          INTEGER NOT NULL DEFAULT 0,
    title           TEXT NOT NULL,
    summary         TEXT NOT NULL,
    problem_detail  TEXT,
    trend_direction TEXT NOT NULL DEFAULT 'stable'
        CHECK (trend_direction IN ('growing', 'stable', 'declining')),
    opportunity_signal TEXT,
    alternatives    JSONB NOT NULL DEFAULT '[]'
);
COMMENT ON TABLE brief IS 'AI-generated product briefs synthesized from top need clusters';
COMMENT ON COLUMN brief.summary IS 'Short summary visible to all users (free + pro)';
COMMENT ON COLUMN brief.problem_detail IS 'Full problem analysis, visible to Pro users only';
COMMENT ON COLUMN brief.opportunity_score IS 'AI-assessed business viability score (0-10)';
COMMENT ON COLUMN brief.opportunity_signal IS 'One-line AI assessment of business viability';
COMMENT ON COLUMN brief.alternatives IS 'JSON array: [{"name": "Product", "shortcomings": "..."}]';

-- Query: briefs by cycle + opportunity score
CREATE INDEX idx_brief_cycle_score ON brief (cycle_id DESC, opportunity_score DESC);

-- FK index: cluster_id
CREATE INDEX idx_brief_cluster ON brief (cluster_id);

-- ----------------------------------------------------------
-- brief_source: Evidence posts linked to a brief
-- ----------------------------------------------------------
CREATE TABLE brief_source (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    brief_id        BIGINT NOT NULL REFERENCES brief (id) ON DELETE CASCADE,
    post_id         BIGINT NOT NULL REFERENCES post (id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    display_order   SMALLINT NOT NULL DEFAULT 0,
    excerpt         TEXT
);
COMMENT ON TABLE brief_source IS 'Source evidence posts linked to an AI brief';
COMMENT ON COLUMN brief_source.display_order IS 'Presentation order of evidence posts within the brief';
COMMENT ON COLUMN brief_source.excerpt IS 'Relevant snippet from the source post, selected by LLM';

-- Prevent duplicate post references per brief
CREATE UNIQUE INDEX uq_brief_source ON brief_source (brief_id, post_id);

-- FK indexes
CREATE INDEX idx_brief_source_brief ON brief_source (brief_id);
CREATE INDEX idx_brief_source_post ON brief_source (post_id);

-- ----------------------------------------------------------
-- product: Resolved product entities from cross-platform data
-- ----------------------------------------------------------
CREATE TABLE product (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    trending_score  NUMERIC(10, 4) NOT NULL DEFAULT 0,
    complaint_count INTEGER NOT NULL DEFAULT 0,
    need_count      INTEGER NOT NULL DEFAULT 0,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    description     TEXT,
    sentiment_summary TEXT,
    platforms       JSONB NOT NULL DEFAULT '[]',
    platform_metadata JSONB NOT NULL DEFAULT '{}'
);
COMMENT ON TABLE product IS 'Resolved product entities aggregated across platforms';
COMMENT ON COLUMN product.slug IS 'URL-safe unique identifier for the product';
COMMENT ON COLUMN product.trending_score IS 'Composite score: engagement growth + complaint volume + recency';
COMMENT ON COLUMN product.platforms IS 'Array of post_source values where this product was found';
COMMENT ON COLUMN product.platform_metadata IS 'Per-platform metrics (PH upvotes, GitHub stars, Store ratings, etc.)';

-- Unique slug for URL routing
CREATE UNIQUE INDEX uq_product_slug ON product (slug);

-- Query: products by trending score
CREATE INDEX idx_product_trending ON product (trending_score DESC);

-- ----------------------------------------------------------
-- product_post: M2M junction between products and posts
-- ----------------------------------------------------------
CREATE TABLE product_post (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id      BIGINT NOT NULL REFERENCES product (id) ON DELETE CASCADE,
    post_id         BIGINT NOT NULL REFERENCES post (id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE product_post IS 'Maps posts to the products they reference';

-- Prevent duplicate product-post links
CREATE UNIQUE INDEX uq_product_post ON product_post (product_id, post_id);

-- FK indexes
CREATE INDEX idx_product_post_product ON product_post (product_id);
CREATE INDEX idx_product_post_post ON product_post (post_id);

-- ----------------------------------------------------------
-- user_account: Registered users (Google OAuth)
-- ----------------------------------------------------------
CREATE TABLE user_account (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    google_id             TEXT NOT NULL,
    email                 TEXT NOT NULL,
    display_name          TEXT NOT NULL,
    tier                  user_tier NOT NULL DEFAULT 'free',
    stripe_customer_id    TEXT,
    stripe_subscription_id TEXT
);
COMMENT ON TABLE user_account IS 'Registered user accounts (Google OAuth)';
COMMENT ON COLUMN user_account.google_id IS 'Unique Google OAuth subject identifier';
COMMENT ON COLUMN user_account.tier IS 'Subscription tier: free or pro';
COMMENT ON COLUMN user_account.stripe_customer_id IS 'Stripe customer ID (set on first checkout)';
COMMENT ON COLUMN user_account.stripe_subscription_id IS 'Active Stripe subscription ID (NULL if no subscription)';

CREATE UNIQUE INDEX uq_user_google_id ON user_account (google_id);
CREATE UNIQUE INDEX uq_user_email ON user_account (email);

-- ----------------------------------------------------------
-- bookmark: User bookmarks for posts, briefs, or products
-- ----------------------------------------------------------
CREATE TABLE bookmark (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES user_account (id) ON DELETE CASCADE,
    post_id         BIGINT REFERENCES post (id) ON DELETE CASCADE,
    brief_id        BIGINT REFERENCES brief (id) ON DELETE CASCADE,
    product_id      BIGINT REFERENCES product (id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Exactly one target must be set
    CONSTRAINT chk_bookmark_one_target CHECK (
        (post_id IS NOT NULL)::INT
        + (brief_id IS NOT NULL)::INT
        + (product_id IS NOT NULL)::INT = 1
    )
);
COMMENT ON TABLE bookmark IS 'User bookmarks — polymorphic via separate FK columns';

-- Query: user bookmarks, newest first
CREATE INDEX idx_bookmark_user_created ON bookmark (user_id, created_at DESC);

-- Prevent duplicate bookmarks per type
CREATE UNIQUE INDEX uq_bookmark_user_post ON bookmark (user_id, post_id)
    WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX uq_bookmark_user_brief ON bookmark (user_id, brief_id)
    WHERE brief_id IS NOT NULL;
CREATE UNIQUE INDEX uq_bookmark_user_product ON bookmark (user_id, product_id)
    WHERE product_id IS NOT NULL;

-- ----------------------------------------------------------
-- tracked_keyword: User keyword/domain tracking (Pro only)
-- ----------------------------------------------------------
CREATE TABLE tracked_keyword (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES user_account (id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    keyword         TEXT NOT NULL,
    type            keyword_type NOT NULL DEFAULT 'keyword',
    is_active       BOOLEAN NOT NULL DEFAULT true
);
COMMENT ON TABLE tracked_keyword IS 'Keywords and domains tracked by Pro users for notifications';

-- Query: active keywords per user
CREATE INDEX idx_tracked_keyword_user ON tracked_keyword (user_id)
    WHERE is_active = true;

-- Prevent duplicate keywords per user
CREATE UNIQUE INDEX uq_tracked_keyword_user_keyword ON tracked_keyword (user_id, keyword, type);

-- ----------------------------------------------------------
-- notification: In-app notifications for tracked keyword matches
-- ----------------------------------------------------------
CREATE TABLE notification (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES user_account (id) ON DELETE CASCADE,
    post_id         BIGINT REFERENCES post (id) ON DELETE SET NULL,
    keyword_id      BIGINT REFERENCES tracked_keyword (id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    title           TEXT NOT NULL,
    message         TEXT,
    is_read         BOOLEAN NOT NULL DEFAULT false
);
COMMENT ON TABLE notification IS 'In-app notifications for tracked keyword matches';

-- Query: unread notifications per user
CREATE INDEX idx_notification_user_unread ON notification (user_id, created_at DESC)
    WHERE is_read = false;

-- FK indexes
CREATE INDEX idx_notification_post ON notification (post_id);
CREATE INDEX idx_notification_keyword ON notification (keyword_id);

-- ----------------------------------------------------------
-- trending_keyword: Trending keywords per cycle for sidebar
-- ----------------------------------------------------------
CREATE TABLE trending_keyword (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cycle_id        BIGINT NOT NULL REFERENCES pipeline_cycle (id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    trend_score     NUMERIC(10, 4) NOT NULL DEFAULT 0,
    mention_count   INTEGER NOT NULL DEFAULT 0,
    keyword         TEXT NOT NULL,
    source          post_source NOT NULL
);
COMMENT ON TABLE trending_keyword IS 'Trending keywords per pipeline cycle, used for the sidebar panel';

-- Query: trending keywords by cycle + source + score
CREATE INDEX idx_trending_keyword_cycle ON trending_keyword (cycle_id DESC, source, trend_score DESC);

-- Prevent duplicate keyword-source pairs per cycle
CREATE UNIQUE INDEX uq_trending_keyword_cycle ON trending_keyword (cycle_id, keyword, source);

-- ============================================================
-- Trigger: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pipeline_cycle_updated_at
    BEFORE UPDATE ON pipeline_cycle
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_post_updated_at
    BEFORE UPDATE ON post
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_need_cluster_updated_at
    BEFORE UPDATE ON need_cluster
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_brief_updated_at
    BEFORE UPDATE ON brief
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_product_updated_at
    BEFORE UPDATE ON product
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_account_updated_at
    BEFORE UPDATE ON user_account
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tracked_keyword_updated_at
    BEFORE UPDATE ON tracked_keyword
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
