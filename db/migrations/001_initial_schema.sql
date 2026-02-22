-- 001_initial_schema.sql
-- idea-fork: initial database schema
-- PostgreSQL 16 (Neon serverless)

-- =============================================================================
-- Extensions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- Utility functions
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- post: raw user complaints ingested from external platforms
-- -----------------------------------------------------------------------------
CREATE TABLE post (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    external_created_at TIMESTAMPTZ NOT NULL,
    deleted_at          TIMESTAMPTZ,
    score               INTEGER NOT NULL DEFAULT 0,
    num_comments        INTEGER NOT NULL DEFAULT 0,
    source              TEXT NOT NULL DEFAULT 'reddit',
    external_id         TEXT NOT NULL,
    subreddit           TEXT,
    title               TEXT NOT NULL,
    body                TEXT,
    external_url        TEXT NOT NULL,
    post_type           TEXT,
    sentiment           TEXT,
    tagging_status      TEXT NOT NULL DEFAULT 'pending',
    search_vector       tsvector,

    CONSTRAINT uq_post_source_external_id UNIQUE (source, external_id),
    CONSTRAINT chk_post_source CHECK (source IN ('reddit', 'app_store', 'play_store')),
    CONSTRAINT chk_post_type CHECK (post_type IS NULL OR post_type IN (
        'complaint', 'feature_request', 'question', 'discussion', 'other'
    )),
    CONSTRAINT chk_post_sentiment CHECK (sentiment IS NULL OR sentiment IN (
        'positive', 'negative', 'neutral', 'mixed'
    )),
    CONSTRAINT chk_post_tagging_status CHECK (tagging_status IN ('pending', 'tagged', 'failed'))
);

CREATE TRIGGER trg_post_updated_at
    BEFORE UPDATE ON post
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON TABLE post IS 'Raw user complaints and needs ingested from external platforms (Reddit, App Store, Google Play)';
COMMENT ON COLUMN post.source IS 'Source platform: reddit, app_store, play_store';
COMMENT ON COLUMN post.external_id IS 'Unique identifier on the source platform (e.g., Reddit post ID)';
COMMENT ON COLUMN post.subreddit IS 'Reddit subreddit name (null for non-Reddit sources)';
COMMENT ON COLUMN post.external_url IS 'Permalink to the original post on the source platform';
COMMENT ON COLUMN post.post_type IS 'LLM-classified post type; null until tagging completes';
COMMENT ON COLUMN post.sentiment IS 'LLM-classified sentiment; null until tagging completes';
COMMENT ON COLUMN post.tagging_status IS 'Pipeline tagging lifecycle: pending → tagged | failed';
COMMENT ON COLUMN post.deleted_at IS 'Soft delete timestamp for 12-month archival policy';
COMMENT ON COLUMN post.search_vector IS 'Full-text search tsvector generated from title and body';

-- -----------------------------------------------------------------------------
-- tag: LLM-generated category tags (SaaS, mobile app, developer tools, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE tag (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name       TEXT NOT NULL,
    slug       TEXT NOT NULL,

    CONSTRAINT uq_tag_name UNIQUE (name),
    CONSTRAINT uq_tag_slug UNIQUE (slug),
    CONSTRAINT chk_tag_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
    CONSTRAINT chk_tag_slug_length CHECK (char_length(slug) BETWEEN 1 AND 100)
);

COMMENT ON TABLE tag IS 'LLM-generated category tags applied to posts (e.g., SaaS, mobile app, developer tools)';
COMMENT ON COLUMN tag.slug IS 'URL-friendly version of the tag name for feed filtering';

-- -----------------------------------------------------------------------------
-- post_tag: many-to-many junction between posts and tags
-- -----------------------------------------------------------------------------
CREATE TABLE post_tag (
    post_id BIGINT NOT NULL REFERENCES post(id) ON DELETE CASCADE,
    tag_id  BIGINT NOT NULL REFERENCES tag(id) ON DELETE CASCADE,

    PRIMARY KEY (post_id, tag_id)
);

COMMENT ON TABLE post_tag IS 'Junction table linking posts to their LLM-assigned category tags';

-- -----------------------------------------------------------------------------
-- cluster: groups of thematically related posts
-- -----------------------------------------------------------------------------
CREATE TABLE cluster (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    post_count INTEGER NOT NULL DEFAULT 0,
    label      TEXT NOT NULL,
    summary    TEXT,
    status     TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT chk_cluster_status CHECK (status IN ('active', 'merged', 'archived')),
    CONSTRAINT chk_cluster_post_count CHECK (post_count >= 0)
);

CREATE TRIGGER trg_cluster_updated_at
    BEFORE UPDATE ON cluster
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON TABLE cluster IS 'Groups of thematically related posts, input to brief generation';
COMMENT ON COLUMN cluster.label IS 'Human-readable theme label (e.g., "Customer support automation frustration")';
COMMENT ON COLUMN cluster.post_count IS 'Denormalized count of posts in this cluster';
COMMENT ON COLUMN cluster.status IS 'Lifecycle: active (in use), merged (absorbed into another), archived';

-- -----------------------------------------------------------------------------
-- cluster_post: many-to-many junction between clusters and posts
-- -----------------------------------------------------------------------------
CREATE TABLE cluster_post (
    cluster_id BIGINT NOT NULL REFERENCES cluster(id) ON DELETE CASCADE,
    post_id    BIGINT NOT NULL REFERENCES post(id) ON DELETE CASCADE,

    PRIMARY KEY (cluster_id, post_id)
);

COMMENT ON TABLE cluster_post IS 'Junction table linking clusters to their member posts';

-- -----------------------------------------------------------------------------
-- brief: AI-generated product opportunity briefs
-- -----------------------------------------------------------------------------
CREATE TABLE brief (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at        TIMESTAMPTZ,
    cluster_id          BIGINT REFERENCES cluster(id) ON DELETE SET NULL,
    source_count        INTEGER NOT NULL DEFAULT 0,
    upvote_count        INTEGER NOT NULL DEFAULT 0,
    downvote_count      INTEGER NOT NULL DEFAULT 0,
    title               TEXT NOT NULL,
    slug                TEXT NOT NULL,
    summary             TEXT NOT NULL,
    problem_statement   TEXT NOT NULL,
    opportunity         TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending',
    demand_signals      JSONB NOT NULL DEFAULT '{}',
    solution_directions JSONB NOT NULL DEFAULT '[]',
    source_snapshots    JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT uq_brief_slug UNIQUE (slug),
    CONSTRAINT chk_brief_status CHECK (status IN ('pending', 'published', 'archived')),
    CONSTRAINT chk_brief_slug_length CHECK (char_length(slug) BETWEEN 1 AND 200),
    CONSTRAINT chk_brief_source_count CHECK (source_count >= 0),
    CONSTRAINT chk_brief_upvote_count CHECK (upvote_count >= 0),
    CONSTRAINT chk_brief_downvote_count CHECK (downvote_count >= 0)
);

CREATE TRIGGER trg_brief_updated_at
    BEFORE UPDATE ON brief
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON TABLE brief IS 'AI-generated product opportunity briefs synthesized from post clusters';
COMMENT ON COLUMN brief.slug IS 'URL-friendly identifier for SEO-friendly brief pages';
COMMENT ON COLUMN brief.problem_statement IS 'Synthesized description of the user pain point';
COMMENT ON COLUMN brief.opportunity IS 'Synthesized description of the product opportunity';
COMMENT ON COLUMN brief.demand_signals IS 'Precomputed demand metrics: {post_count, subreddit_count, avg_score, newest_post_at}';
COMMENT ON COLUMN brief.solution_directions IS 'LLM-suggested solution directions: ["direction 1", "direction 2"]';
COMMENT ON COLUMN brief.source_snapshots IS 'Denormalized source posts: [{post_id, title, snippet, external_url, subreddit, score}]';
COMMENT ON COLUMN brief.source_count IS 'Denormalized count of source posts for sorting/filtering';
COMMENT ON COLUMN brief.upvote_count IS 'Denormalized positive rating count';
COMMENT ON COLUMN brief.downvote_count IS 'Denormalized negative rating count';

-- -----------------------------------------------------------------------------
-- brief_source: normalized link between briefs and their source posts
-- -----------------------------------------------------------------------------
CREATE TABLE brief_source (
    brief_id BIGINT NOT NULL REFERENCES brief(id) ON DELETE CASCADE,
    post_id  BIGINT NOT NULL REFERENCES post(id) ON DELETE CASCADE,
    snippet  TEXT,

    PRIMARY KEY (brief_id, post_id)
);

COMMENT ON TABLE brief_source IS 'Normalized link between briefs and source posts (integrity complement to brief.source_snapshots)';
COMMENT ON COLUMN brief_source.snippet IS 'Relevant excerpt from the post used in the brief';

-- -----------------------------------------------------------------------------
-- product: trending products paired with user complaints
-- -----------------------------------------------------------------------------
CREATE TABLE product (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    launched_at     TIMESTAMPTZ,
    complaint_count INTEGER NOT NULL DEFAULT 0,
    trending_score  NUMERIC(10, 4) NOT NULL DEFAULT 0,
    source          TEXT NOT NULL DEFAULT 'producthunt',
    external_id     TEXT NOT NULL,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    tagline         TEXT,
    description     TEXT,
    url             TEXT,
    image_url       TEXT,
    category        TEXT,

    CONSTRAINT uq_product_slug UNIQUE (slug),
    CONSTRAINT uq_product_source_external_id UNIQUE (source, external_id),
    CONSTRAINT chk_product_source CHECK (source IN ('producthunt')),
    CONSTRAINT chk_product_slug_length CHECK (char_length(slug) BETWEEN 1 AND 200),
    CONSTRAINT chk_product_external_id_length CHECK (char_length(external_id) BETWEEN 1 AND 500),
    CONSTRAINT chk_product_name_length CHECK (char_length(name) BETWEEN 1 AND 500),
    CONSTRAINT chk_product_complaint_count CHECK (complaint_count >= 0),
    CONSTRAINT chk_product_trending_score CHECK (trending_score >= 0 AND trending_score < 'Infinity'::NUMERIC),
    CONSTRAINT chk_product_url_scheme CHECK (url IS NULL OR url ~ '^https?://'),
    CONSTRAINT chk_product_image_url_scheme CHECK (image_url IS NULL OR image_url ~ '^https?://')
);

CREATE TRIGGER trg_product_updated_at
    BEFORE UPDATE ON product
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON TABLE product IS 'Trending products ingested from Product Hunt, paired with aggregated user complaints';
COMMENT ON COLUMN product.source IS 'Source platform: producthunt';
COMMENT ON COLUMN product.external_id IS 'Unique identifier on the source platform (e.g., Product Hunt product ID)';
COMMENT ON COLUMN product.launched_at IS 'Product launch date from Product Hunt';
COMMENT ON COLUMN product.tagline IS 'Short product tagline from Product Hunt';
COMMENT ON COLUMN product.complaint_count IS 'Denormalized count of linked complaint posts';
COMMENT ON COLUMN product.trending_score IS 'Pipeline-computed trending score for sorting';

-- -----------------------------------------------------------------------------
-- product_post: many-to-many junction between products and complaint posts
-- -----------------------------------------------------------------------------
CREATE TABLE product_post (
    product_id BIGINT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    post_id    BIGINT NOT NULL REFERENCES post(id) ON DELETE CASCADE,

    PRIMARY KEY (product_id, post_id)
);

COMMENT ON TABLE product_post IS 'Junction table linking products to their complaint posts';

-- -----------------------------------------------------------------------------
-- rating: anonymous brief ratings (session-based, no auth)
-- -----------------------------------------------------------------------------
CREATE TABLE rating (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    brief_id    BIGINT NOT NULL REFERENCES brief(id) ON DELETE CASCADE,
    is_positive BOOLEAN NOT NULL,
    session_id  TEXT NOT NULL,
    feedback    TEXT,

    CONSTRAINT uq_rating_brief_session UNIQUE (brief_id, session_id),
    CONSTRAINT chk_rating_session_id_length CHECK (char_length(session_id) BETWEEN 1 AND 255),
    CONSTRAINT chk_rating_feedback_length CHECK (feedback IS NULL OR char_length(feedback) <= 1000)
);

COMMENT ON TABLE rating IS 'Anonymous brief ratings using session-based deduplication (1 rating per brief per session)';
COMMENT ON COLUMN rating.session_id IS 'Anonymous session identifier from httpOnly cookie';
COMMENT ON COLUMN rating.is_positive IS 'true = thumbs up, false = thumbs down';
COMMENT ON COLUMN rating.feedback IS 'Optional text feedback (shown for negative ratings)';

-- =============================================================================
-- Indexes
-- =============================================================================

-- post: feed listing (keyset pagination by recency, active posts only)
CREATE INDEX idx_post_feed ON post (external_created_at DESC, id DESC)
    WHERE deleted_at IS NULL;

-- post: feed listing by subreddit
CREATE INDEX idx_post_subreddit ON post (subreddit, external_created_at DESC)
    WHERE deleted_at IS NULL;

-- post: full-text search (GIN on tsvector)
CREATE INDEX idx_post_search_vector ON post USING GIN (search_vector)
    WHERE deleted_at IS NULL;

-- post: trigram index for keyword/prefix search on title
CREATE INDEX idx_post_title_trgm ON post USING GIN (title gin_trgm_ops)
    WHERE deleted_at IS NULL;

-- post: pipeline picks up untagged posts
CREATE INDEX idx_post_tagging_pending ON post (created_at)
    WHERE tagging_status = 'pending';

-- post_tag: reverse lookup (find posts by tag)
CREATE INDEX idx_post_tag_tag_id ON post_tag (tag_id);

-- cluster_post: reverse lookup (find clusters for a post)
CREATE INDEX idx_cluster_post_post_id ON cluster_post (post_id);

-- cluster: active clusters for pipeline processing
CREATE INDEX idx_cluster_active ON cluster (updated_at DESC)
    WHERE status = 'active';

-- brief: published briefs listing (keyset pagination)
CREATE INDEX idx_brief_published ON brief (published_at DESC, id DESC)
    WHERE status = 'published';

-- brief: FK index on cluster_id
CREATE INDEX idx_brief_cluster_id ON brief (cluster_id);

-- brief_source: reverse lookup (find briefs citing a post)
CREATE INDEX idx_brief_source_post_id ON brief_source (post_id);

-- product: listing sorted by trending score
CREATE INDEX idx_product_trending ON product (trending_score DESC, id DESC);

-- product: listing sorted by complaint count
CREATE INDEX idx_product_complaints ON product (complaint_count DESC, id DESC);

-- product: listing by launch date
CREATE INDEX idx_product_launched ON product (launched_at DESC, id DESC)
    WHERE launched_at IS NOT NULL;

-- product_post: reverse lookup (find products for a post)
CREATE INDEX idx_product_post_post_id ON product_post (post_id);

-- =============================================================================
-- Search vector trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_post_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector = to_tsvector('english',
        coalesce(NEW.title, '') || ' ' || coalesce(NEW.body, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_search_vector
    BEFORE INSERT OR UPDATE OF title, body ON post
    FOR EACH ROW EXECUTE FUNCTION fn_post_search_vector();
