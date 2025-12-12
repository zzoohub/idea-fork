-- =============================================================================
-- Idea Fork Database Schema
-- PostgreSQL 15+ Compatible
-- =============================================================================
--
-- This schema supports the Idea Fork MVP application:
-- - Daily AI-generated product ideas (1-3 per day)
-- - Comprehensive PRD generation
-- - Category-based filtering and full-text search
-- - PDF/DOCX document generation tracking
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- EXTENSIONS
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Trigram similarity for fuzzy search
CREATE EXTENSION IF NOT EXISTS "btree_gin";      -- GIN indexes for scalar types

-- -----------------------------------------------------------------------------
-- CUSTOM TYPES (ENUMS)
-- -----------------------------------------------------------------------------

-- Idea publication status
CREATE TYPE idea_status AS ENUM (
    'draft',        -- AI generated, pending review
    'published',    -- Visible to users
    'archived'      -- Hidden from feed but preserved
);

-- PRD feature priority (MoSCoW method)
CREATE TYPE feature_priority AS ENUM (
    'must_have',    -- P0: Critical for MVP
    'should_have',  -- P1: Important but not critical
    'could_have',   -- P2: Nice to have
    'wont_have'     -- P3: Explicitly excluded from MVP
);

-- AI generation status
CREATE TYPE generation_status AS ENUM (
    'success',      -- Complete generation
    'failed',       -- Generation failed
    'partial'       -- Partial generation (e.g., idea without PRD)
);

-- Category color themes (matching frontend)
CREATE TYPE category_color AS ENUM (
    'primary',      -- Blue/default theme
    'teal',         -- Teal theme
    'orange',       -- Orange theme
    'indigo'        -- Indigo theme
);

-- -----------------------------------------------------------------------------
-- TABLE: categories
-- -----------------------------------------------------------------------------
-- Stores predefined idea categories (SaaS, E-commerce, Social, etc.)
-- These are seeded once and rarely modified.
-- -----------------------------------------------------------------------------

CREATE TABLE categories (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    color           category_color NOT NULL DEFAULT 'primary',
    description     TEXT,
    display_order   SMALLINT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT categories_name_unique UNIQUE (name),
    CONSTRAINT categories_slug_unique UNIQUE (slug),
    CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT categories_display_order_positive CHECK (display_order >= 0)
);

-- Indexes for categories
CREATE INDEX idx_categories_active_order
    ON categories (is_active, display_order)
    WHERE is_active = TRUE;

COMMENT ON TABLE categories IS 'Predefined idea categories for classification';
COMMENT ON COLUMN categories.slug IS 'URL-friendly identifier (lowercase, hyphens only)';
COMMENT ON COLUMN categories.color IS 'UI theme color matching frontend badge styles';

-- -----------------------------------------------------------------------------
-- TABLE: ideas
-- -----------------------------------------------------------------------------
-- Central table storing all AI-generated product ideas.
-- This is the primary entity that users browse and discover.
-- -----------------------------------------------------------------------------

CREATE TABLE ideas (
    id              BIGSERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    slug            VARCHAR(280) NOT NULL,
    thumbnail_url   TEXT,
    problem         TEXT NOT NULL,
    solution        TEXT NOT NULL,
    target_users    TEXT NOT NULL,
    status          idea_status NOT NULL DEFAULT 'draft',
    generated_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    view_count      INTEGER NOT NULL DEFAULT 0,
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,

    -- Full-text search vector (auto-updated via trigger)
    search_vector   TSVECTOR,

    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,  -- Soft delete

    -- Constraints
    CONSTRAINT ideas_slug_unique UNIQUE (slug),
    CONSTRAINT ideas_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT ideas_view_count_positive CHECK (view_count >= 0),
    CONSTRAINT ideas_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT ideas_problem_not_empty CHECK (LENGTH(TRIM(problem)) > 0),
    CONSTRAINT ideas_solution_not_empty CHECK (LENGTH(TRIM(solution)) > 0)
);

-- Primary query indexes
CREATE INDEX idx_ideas_generated_date
    ON ideas (generated_date DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_ideas_status_deleted
    ON ideas (status, deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_ideas_slug
    ON ideas (slug)
    WHERE deleted_at IS NULL;

-- Full-text search index (GIN for fast text search)
CREATE INDEX idx_ideas_search_vector
    ON ideas USING GIN (search_vector);

-- Partial index for featured ideas
CREATE INDEX idx_ideas_featured
    ON ideas (generated_date DESC)
    WHERE is_featured = TRUE AND deleted_at IS NULL AND status = 'published';

-- Composite index for feed pagination
CREATE INDEX idx_ideas_feed
    ON ideas (status, generated_date DESC, id DESC)
    WHERE deleted_at IS NULL;

COMMENT ON TABLE ideas IS 'AI-generated product ideas with core attributes';
COMMENT ON COLUMN ideas.generated_date IS 'Date when idea was generated (for daily grouping)';
COMMENT ON COLUMN ideas.view_count IS 'Denormalized view counter for performance';
COMMENT ON COLUMN ideas.search_vector IS 'Pre-computed tsvector for full-text search';
COMMENT ON COLUMN ideas.deleted_at IS 'Soft delete timestamp; NULL means active';

-- -----------------------------------------------------------------------------
-- TABLE: idea_categories (Junction)
-- -----------------------------------------------------------------------------
-- Many-to-many relationship between ideas and categories.
-- An idea can belong to multiple categories (e.g., "AI" + "E-commerce").
-- -----------------------------------------------------------------------------

CREATE TABLE idea_categories (
    idea_id         BIGINT NOT NULL,
    category_id     BIGINT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Composite primary key
    PRIMARY KEY (idea_id, category_id),

    -- Foreign keys
    CONSTRAINT fk_idea_categories_idea
        FOREIGN KEY (idea_id)
        REFERENCES ideas (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_idea_categories_category
        FOREIGN KEY (category_id)
        REFERENCES categories (id)
        ON DELETE RESTRICT
);

-- Index for reverse lookups (find ideas by category)
CREATE INDEX idx_idea_categories_category_id
    ON idea_categories (category_id);

COMMENT ON TABLE idea_categories IS 'Junction table for idea-category many-to-many relationship';

-- -----------------------------------------------------------------------------
-- TABLE: idea_features
-- -----------------------------------------------------------------------------
-- Stores the 3 key features for each idea as specified in PRD.
-- Limited to 3 features per idea via application logic.
-- -----------------------------------------------------------------------------

CREATE TABLE idea_features (
    id              BIGSERIAL PRIMARY KEY,
    idea_id         BIGINT NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    display_order   SMALLINT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign key
    CONSTRAINT fk_idea_features_idea
        FOREIGN KEY (idea_id)
        REFERENCES ideas (id)
        ON DELETE CASCADE,

    -- Constraints
    CONSTRAINT idea_features_order_range CHECK (display_order BETWEEN 1 AND 10),
    CONSTRAINT idea_features_title_not_empty CHECK (LENGTH(TRIM(title)) > 0)
);

-- Index for fetching features by idea
CREATE INDEX idx_idea_features_idea_order
    ON idea_features (idea_id, display_order);

COMMENT ON TABLE idea_features IS 'Key features for each idea (typically 3 per idea)';
COMMENT ON COLUMN idea_features.display_order IS 'Order of display (1, 2, 3...)';

-- -----------------------------------------------------------------------------
-- TABLE: idea_prds
-- -----------------------------------------------------------------------------
-- Comprehensive Product Requirements Document for each idea.
-- One-to-one relationship with ideas (enforced by unique constraint).
-- -----------------------------------------------------------------------------

CREATE TABLE idea_prds (
    id                  BIGSERIAL PRIMARY KEY,
    idea_id             BIGINT NOT NULL,

    -- PRD Content Sections
    executive_summary   TEXT NOT NULL,
    problem_definition  TEXT NOT NULL,

    -- JSONB fields for complex nested data
    -- Market Analysis: { "market_size": "...", "competitors": [...], "trends": [...] }
    market_analysis     JSONB NOT NULL DEFAULT '{}',

    -- Tech Stack: [{ "category": "frontend", "technologies": ["React", "Next.js"], "rationale": "..." }]
    tech_stack          JSONB NOT NULL DEFAULT '[]',

    -- MVP Roadmap: { "phases": [{ "name": "...", "duration": "...", "milestones": [...] }] }
    mvp_roadmap         JSONB NOT NULL DEFAULT '{}',

    -- Success Metrics: [{ "metric": "DAU", "target": "10,000", "timeframe": "6 months" }]
    success_metrics     JSONB NOT NULL DEFAULT '[]',

    -- Generated document URLs
    pdf_url             TEXT,
    docx_url            TEXT,

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign key with unique constraint (enforces 1:1)
    CONSTRAINT fk_idea_prds_idea
        FOREIGN KEY (idea_id)
        REFERENCES ideas (id)
        ON DELETE CASCADE,

    CONSTRAINT idea_prds_idea_unique UNIQUE (idea_id),
    CONSTRAINT idea_prds_summary_not_empty CHECK (LENGTH(TRIM(executive_summary)) > 0)
);

-- Index for JSONB queries on tech stack
CREATE INDEX idx_idea_prds_tech_stack
    ON idea_prds USING GIN (tech_stack);

-- Index for JSONB queries on market analysis
CREATE INDEX idx_idea_prds_market_analysis
    ON idea_prds USING GIN (market_analysis);

COMMENT ON TABLE idea_prds IS 'Comprehensive PRD document for each idea (1:1 with ideas)';
COMMENT ON COLUMN idea_prds.market_analysis IS 'JSONB: Market size, competitors, trends analysis';
COMMENT ON COLUMN idea_prds.tech_stack IS 'JSONB array: Recommended technologies by category';
COMMENT ON COLUMN idea_prds.mvp_roadmap IS 'JSONB: Development phases and milestones';
COMMENT ON COLUMN idea_prds.success_metrics IS 'JSONB array: KPIs with targets and timeframes';

-- -----------------------------------------------------------------------------
-- TABLE: user_personas
-- -----------------------------------------------------------------------------
-- User personas defined within each PRD.
-- Multiple personas per PRD (typically 2-4).
-- -----------------------------------------------------------------------------

CREATE TABLE user_personas (
    id              BIGSERIAL PRIMARY KEY,
    prd_id          BIGINT NOT NULL,
    name            VARCHAR(100) NOT NULL,
    description     TEXT NOT NULL,

    -- JSONB for flexible arrays
    -- Goals: ["Increase productivity", "Save time on routine tasks"]
    goals           JSONB NOT NULL DEFAULT '[]',

    -- Pain Points: ["Current tools are too complex", "No mobile support"]
    pain_points     JSONB NOT NULL DEFAULT '[]',

    display_order   SMALLINT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign key
    CONSTRAINT fk_user_personas_prd
        FOREIGN KEY (prd_id)
        REFERENCES idea_prds (id)
        ON DELETE CASCADE,

    -- Constraints
    CONSTRAINT user_personas_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT user_personas_order_positive CHECK (display_order > 0)
);

-- Index for fetching personas by PRD
CREATE INDEX idx_user_personas_prd_order
    ON user_personas (prd_id, display_order);

COMMENT ON TABLE user_personas IS 'User personas described in the PRD';
COMMENT ON COLUMN user_personas.goals IS 'JSONB array: What this persona wants to achieve';
COMMENT ON COLUMN user_personas.pain_points IS 'JSONB array: Current frustrations and challenges';

-- -----------------------------------------------------------------------------
-- TABLE: prd_features
-- -----------------------------------------------------------------------------
-- Detailed feature specifications within the PRD.
-- More comprehensive than idea_features (includes user stories, criteria).
-- -----------------------------------------------------------------------------

CREATE TABLE prd_features (
    id                  BIGSERIAL PRIMARY KEY,
    prd_id              BIGINT NOT NULL,
    title               VARCHAR(255) NOT NULL,
    description         TEXT NOT NULL,
    priority            feature_priority NOT NULL DEFAULT 'should_have',

    -- User Stories: [{ "as_a": "user", "i_want": "...", "so_that": "..." }]
    user_stories        JSONB NOT NULL DEFAULT '[]',

    -- Acceptance Criteria: ["Given X, When Y, Then Z", ...]
    acceptance_criteria JSONB NOT NULL DEFAULT '[]',

    display_order       SMALLINT NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign key
    CONSTRAINT fk_prd_features_prd
        FOREIGN KEY (prd_id)
        REFERENCES idea_prds (id)
        ON DELETE CASCADE,

    -- Constraints
    CONSTRAINT prd_features_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT prd_features_order_positive CHECK (display_order > 0)
);

-- Indexes for PRD features
CREATE INDEX idx_prd_features_prd_order
    ON prd_features (prd_id, display_order);

CREATE INDEX idx_prd_features_priority
    ON prd_features (prd_id, priority);

COMMENT ON TABLE prd_features IS 'Detailed feature specifications in the PRD';
COMMENT ON COLUMN prd_features.priority IS 'MoSCoW prioritization method';
COMMENT ON COLUMN prd_features.user_stories IS 'JSONB array: User stories in standard format';
COMMENT ON COLUMN prd_features.acceptance_criteria IS 'JSONB array: Gherkin-style acceptance criteria';

-- -----------------------------------------------------------------------------
-- TABLE: generation_logs
-- -----------------------------------------------------------------------------
-- Audit trail for AI generation events.
-- Used for debugging, cost tracking, and quality monitoring.
-- -----------------------------------------------------------------------------

CREATE TABLE generation_logs (
    id                  BIGSERIAL PRIMARY KEY,
    idea_id             BIGINT,  -- Nullable (can fail before idea is created)
    ai_model            VARCHAR(100) NOT NULL,
    prompt_version      VARCHAR(50) NOT NULL,
    generation_time_ms  INTEGER NOT NULL,
    tokens_used         INTEGER,

    -- Full AI response for debugging
    raw_response        JSONB,

    status              generation_status NOT NULL,
    error_message       TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign key (nullable for failed generations)
    CONSTRAINT fk_generation_logs_idea
        FOREIGN KEY (idea_id)
        REFERENCES ideas (id)
        ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT generation_logs_time_positive CHECK (generation_time_ms >= 0),
    CONSTRAINT generation_logs_tokens_positive CHECK (tokens_used IS NULL OR tokens_used >= 0)
);

-- Indexes for generation logs
CREATE INDEX idx_generation_logs_idea
    ON generation_logs (idea_id)
    WHERE idea_id IS NOT NULL;

CREATE INDEX idx_generation_logs_created
    ON generation_logs (created_at DESC);

CREATE INDEX idx_generation_logs_status
    ON generation_logs (status, created_at DESC);

-- Partial index for failed generations (debugging)
CREATE INDEX idx_generation_logs_failures
    ON generation_logs (created_at DESC)
    WHERE status = 'failed';

COMMENT ON TABLE generation_logs IS 'Audit trail for AI generation events';
COMMENT ON COLUMN generation_logs.prompt_version IS 'Version identifier for the prompt template used';
COMMENT ON COLUMN generation_logs.raw_response IS 'Complete AI response for debugging purposes';

-- -----------------------------------------------------------------------------
-- TABLE: daily_stats
-- -----------------------------------------------------------------------------
-- Pre-aggregated daily statistics for analytics dashboard.
-- Updated by scheduled job or trigger.
-- -----------------------------------------------------------------------------

CREATE TABLE daily_stats (
    id              BIGSERIAL PRIMARY KEY,
    stats_date      DATE NOT NULL,
    ideas_generated SMALLINT NOT NULL DEFAULT 0,
    total_views     INTEGER NOT NULL DEFAULT 0,
    unique_visitors INTEGER NOT NULL DEFAULT 0,
    top_category_id BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint on date (one row per day)
    CONSTRAINT daily_stats_date_unique UNIQUE (stats_date),

    -- Foreign key
    CONSTRAINT fk_daily_stats_category
        FOREIGN KEY (top_category_id)
        REFERENCES categories (id)
        ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT daily_stats_ideas_positive CHECK (ideas_generated >= 0),
    CONSTRAINT daily_stats_views_positive CHECK (total_views >= 0),
    CONSTRAINT daily_stats_visitors_positive CHECK (unique_visitors >= 0)
);

-- Index for date range queries
CREATE INDEX idx_daily_stats_date
    ON daily_stats (stats_date DESC);

COMMENT ON TABLE daily_stats IS 'Pre-aggregated daily statistics for analytics';

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Function: Update search vector
-- -----------------------------------------------------------------------------
-- Automatically updates the search_vector column when idea content changes.
-- Combines title, problem, solution, and target_users with weights.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_idea_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.problem, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.solution, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.target_users, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search vector
CREATE TRIGGER trg_ideas_search_vector
    BEFORE INSERT OR UPDATE OF title, problem, solution, target_users
    ON ideas
    FOR EACH ROW
    EXECUTE FUNCTION update_idea_search_vector();

-- -----------------------------------------------------------------------------
-- Function: Update timestamp
-- -----------------------------------------------------------------------------
-- Automatically updates the updated_at column on row modification.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_ideas_updated_at
    BEFORE UPDATE ON ideas
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_idea_prds_updated_at
    BEFORE UPDATE ON idea_prds
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- -----------------------------------------------------------------------------
-- Function: Increment view count
-- -----------------------------------------------------------------------------
-- Safe atomic increment of view count.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION increment_idea_view_count(p_idea_id BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE ideas
    SET view_count = view_count + 1
    WHERE id = p_idea_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- Function: Generate slug from title
-- -----------------------------------------------------------------------------
-- Creates URL-friendly slug from idea title.
-- Handles duplicates by appending numeric suffix.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION generate_idea_slug(p_title VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_base_slug VARCHAR;
    v_slug VARCHAR;
    v_counter INTEGER := 0;
BEGIN
    -- Convert to lowercase, replace spaces/special chars with hyphens
    v_base_slug := LOWER(TRIM(p_title));
    v_base_slug := REGEXP_REPLACE(v_base_slug, '[^a-z0-9]+', '-', 'g');
    v_base_slug := REGEXP_REPLACE(v_base_slug, '-+', '-', 'g');
    v_base_slug := REGEXP_REPLACE(v_base_slug, '^-|-$', '', 'g');
    v_base_slug := LEFT(v_base_slug, 250);  -- Leave room for suffix

    v_slug := v_base_slug;

    -- Check for existing slugs and append counter if needed
    WHILE EXISTS (SELECT 1 FROM ideas WHERE slug = v_slug) LOOP
        v_counter := v_counter + 1;
        v_slug := v_base_slug || '-' || v_counter::VARCHAR;
    END LOOP;

    RETURN v_slug;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Default categories matching the PRD requirements
INSERT INTO categories (name, slug, color, description, display_order) VALUES
    ('SaaS', 'saas', 'primary', 'Software as a Service products', 1),
    ('E-commerce', 'e-commerce', 'teal', 'Online retail and marketplace solutions', 2),
    ('Social', 'social', 'orange', 'Social networking and community platforms', 3),
    ('Productivity', 'productivity', 'indigo', 'Tools to enhance work efficiency', 4),
    ('AI', 'ai', 'primary', 'Artificial Intelligence powered solutions', 5),
    ('FinTech', 'fintech', 'teal', 'Financial technology and services', 6),
    ('HealthTech', 'healthtech', 'orange', 'Healthcare and wellness technology', 7),
    ('EdTech', 'edtech', 'indigo', 'Educational technology and learning platforms', 8),
    ('Gaming', 'gaming', 'primary', 'Video games and interactive entertainment', 9),
    ('DevTools', 'devtools', 'teal', 'Developer tools and infrastructure', 10);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- View: Published ideas with categories
-- -----------------------------------------------------------------------------
-- Convenient view for the main feed query.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_published_ideas AS
SELECT
    i.id,
    i.title,
    i.slug,
    i.thumbnail_url,
    i.problem,
    i.solution,
    i.target_users,
    i.generated_date,
    i.view_count,
    i.is_featured,
    i.created_at,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'name', c.name,
                'color', c.color::text
            ) ORDER BY c.display_order
        ) FILTER (WHERE c.id IS NOT NULL),
        '[]'::jsonb
    ) AS categories
FROM ideas i
LEFT JOIN idea_categories ic ON i.id = ic.idea_id
LEFT JOIN categories c ON ic.category_id = c.id AND c.is_active = TRUE
WHERE i.deleted_at IS NULL
  AND i.status = 'published'
GROUP BY i.id
ORDER BY i.generated_date DESC, i.created_at DESC;

COMMENT ON VIEW v_published_ideas IS 'Published ideas with aggregated category data for feed display';

-- -----------------------------------------------------------------------------
-- View: Daily generation summary
-- -----------------------------------------------------------------------------
-- Shows how many ideas were generated each day.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_daily_generation_summary AS
SELECT
    generated_date,
    COUNT(*) AS ideas_count,
    SUM(view_count) AS total_views,
    COUNT(*) FILTER (WHERE is_featured) AS featured_count
FROM ideas
WHERE deleted_at IS NULL AND status = 'published'
GROUP BY generated_date
ORDER BY generated_date DESC;

COMMENT ON VIEW v_daily_generation_summary IS 'Daily summary of idea generation activity';

-- =============================================================================
-- GRANTS (Adjust roles as needed for your setup)
-- =============================================================================

-- Example role setup (uncomment and adjust as needed):
-- CREATE ROLE idea_fork_app LOGIN PASSWORD 'your_secure_password';
-- GRANT CONNECT ON DATABASE idea_fork TO idea_fork_app;
-- GRANT USAGE ON SCHEMA public TO idea_fork_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO idea_fork_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO idea_fork_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO idea_fork_app;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
