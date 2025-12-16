-- =============================================================================
-- Idea Fork - Database Schema
-- =============================================================================
-- PostgreSQL 14+ compatible
-- Run this script to initialize the database schema
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------

-- Enable pg_trgm for future fuzzy search capabilities
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- -----------------------------------------------------------------------------
-- Categories Table
-- -----------------------------------------------------------------------------
-- Predefined categories for classifying ideas (AI, SaaS, E-commerce, etc.)
-- Categories have a display color variant that matches the frontend badge system

CREATE TABLE categories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Category display name (e.g., "E-commerce", "Developer Tools")
    name TEXT NOT NULL,

    -- URL-safe slug (e.g., "ecommerce", "developer-tools")
    slug TEXT NOT NULL,

    -- Badge color variant for frontend: primary, teal, orange, indigo, secondary
    color_variant TEXT NOT NULL DEFAULT 'secondary',

    -- Custom sort order for category lists in UI
    display_order INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT categories_name_key UNIQUE (name),
    CONSTRAINT categories_slug_key UNIQUE (slug),
    CONSTRAINT categories_color_variant_check CHECK (
        color_variant IN ('primary', 'teal', 'orange', 'indigo', 'secondary')
    )
);

-- Index for ordering categories in UI
CREATE INDEX categories_display_order_idx ON categories(display_order, name);

COMMENT ON TABLE categories IS 'Predefined categories for classifying product ideas';
COMMENT ON COLUMN categories.color_variant IS 'Badge color variant matching frontend: primary, teal, orange, indigo, secondary';
COMMENT ON COLUMN categories.display_order IS 'Custom sort order for category dropdowns and lists';

-- -----------------------------------------------------------------------------
-- Ideas Table
-- -----------------------------------------------------------------------------
-- Core table storing AI-generated product ideas with metadata and PRD content

CREATE TABLE ideas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Basic info
    title TEXT NOT NULL,
    slug TEXT NOT NULL,

    -- Thumbnail image
    image_url TEXT NOT NULL,
    image_alt TEXT NOT NULL DEFAULT '',

    -- Core idea content (always present)
    problem TEXT NOT NULL,      -- Problem statement
    solution TEXT NOT NULL,     -- Proposed solution
    target_users TEXT NOT NULL, -- Target user description

    -- Key features as JSON array: ["Feature 1", "Feature 2", "Feature 3"]
    key_features JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Full PRD content stored as structured JSONB
    -- Contains: executive_summary, market_analysis, user_personas,
    --           features, tech_stack, mvp_roadmap, success_metrics
    prd_content JSONB,

    -- Engagement metrics (denormalized for query performance)
    popularity_score INTEGER NOT NULL DEFAULT 0,
    view_count BIGINT NOT NULL DEFAULT 0,

    -- Publication workflow
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ,

    -- Full-text search vector (auto-populated by trigger)
    search_vector tsvector,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT ideas_slug_key UNIQUE (slug),
    CONSTRAINT ideas_popularity_score_check CHECK (
        popularity_score >= 0 AND popularity_score <= 100
    ),
    CONSTRAINT ideas_view_count_check CHECK (view_count >= 0)
);

COMMENT ON TABLE ideas IS 'AI-generated product ideas with PRD content';
COMMENT ON COLUMN ideas.slug IS 'URL-safe unique identifier for SEO-friendly URLs';
COMMENT ON COLUMN ideas.key_features IS 'JSON array of 3 key feature descriptions';
COMMENT ON COLUMN ideas.prd_content IS 'Full PRD as structured JSONB (executive summary, personas, features, tech stack, roadmap, metrics)';
COMMENT ON COLUMN ideas.popularity_score IS 'Denormalized popularity metric (0-100) for fast sorting';
COMMENT ON COLUMN ideas.search_vector IS 'Auto-populated tsvector for full-text search';

-- -----------------------------------------------------------------------------
-- Ideas Indexes
-- -----------------------------------------------------------------------------

-- Primary listing: published ideas by date (newest first)
-- Supports: ORDER BY published_at DESC with is_published filter
CREATE INDEX ideas_published_at_idx
    ON ideas(published_at DESC)
    WHERE is_published = true;

-- Popularity sorting: published ideas by popularity score
-- Supports: ORDER BY popularity_score DESC with is_published filter
CREATE INDEX ideas_popularity_idx
    ON ideas(popularity_score DESC, published_at DESC)
    WHERE is_published = true;

-- Alphabetical sorting
-- Supports: ORDER BY title ASC
CREATE INDEX ideas_title_idx ON ideas(title);

-- Cursor-based pagination support
-- Supports: WHERE (published_at, id) < (?, ?) ORDER BY published_at DESC, id DESC
CREATE INDEX ideas_cursor_pagination_idx
    ON ideas(published_at DESC, id DESC)
    WHERE is_published = true;

-- Full-text search index using GIN
-- Supports: WHERE search_vector @@ to_tsquery(...)
CREATE INDEX ideas_search_idx ON ideas USING GIN(search_vector);

-- -----------------------------------------------------------------------------
-- Ideas Full-Text Search Trigger
-- -----------------------------------------------------------------------------
-- Automatically updates search_vector when idea content changes

CREATE OR REPLACE FUNCTION ideas_search_vector_update()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.problem, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.solution, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.target_users, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ideas_search_vector_trigger
    BEFORE INSERT OR UPDATE OF title, problem, solution, target_users
    ON ideas
    FOR EACH ROW
    EXECUTE FUNCTION ideas_search_vector_update();

COMMENT ON FUNCTION ideas_search_vector_update() IS 'Updates search_vector with weighted tsvector from title (A), problem/solution (B), target_users (C)';

-- -----------------------------------------------------------------------------
-- Ideas Updated At Trigger
-- -----------------------------------------------------------------------------
-- Automatically updates updated_at timestamp on row modification

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ideas_updated_at_trigger
    BEFORE UPDATE ON ideas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER categories_updated_at_trigger
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Idea Categories Junction Table
-- -----------------------------------------------------------------------------
-- Many-to-many relationship between ideas and categories

CREATE TABLE idea_categories (
    idea_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Composite primary key prevents duplicates
    PRIMARY KEY (idea_id, category_id),

    -- Foreign keys with cascade delete
    CONSTRAINT idea_categories_idea_fkey
        FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
    CONSTRAINT idea_categories_category_fkey
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Index for reverse lookups (finding ideas by category)
-- The primary key already indexes (idea_id, category_id)
CREATE INDEX idea_categories_category_id_idx ON idea_categories(category_id);

COMMENT ON TABLE idea_categories IS 'Junction table linking ideas to their categories (many-to-many)';

-- -----------------------------------------------------------------------------
-- Seed Data: Initial Categories
-- -----------------------------------------------------------------------------
-- Categories from the PRD and frontend mockups

INSERT INTO categories (name, slug, color_variant, display_order) VALUES
    ('AI', 'ai', 'primary', 1),
    ('SaaS', 'saas', 'indigo', 2),
    ('E-commerce', 'ecommerce', 'teal', 3),
    ('Mobile App', 'mobile-app', 'orange', 4),
    ('HealthTech', 'healthtech', 'primary', 5),
    ('FinTech', 'fintech', 'primary', 6),
    ('EdTech', 'edtech', 'primary', 7),
    ('Developer Tools', 'developer-tools', 'primary', 8),
    ('Logistics', 'logistics', 'primary', 9),
    ('Social', 'social', 'teal', 10),
    ('Productivity', 'productivity', 'indigo', 11),
    ('VR', 'vr', 'teal', 12);

-- -----------------------------------------------------------------------------
-- Sample Data: Demo Ideas (Optional - can be removed in production)
-- -----------------------------------------------------------------------------
-- Sample ideas matching the frontend mock data for development/testing

INSERT INTO ideas (
    title, slug, image_url, image_alt,
    problem, solution, target_users,
    key_features, popularity_score, is_published, published_at
) VALUES
(
    'AI-Powered Personal Stylist',
    'ai-powered-personal-stylist',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBHCMyKKOauM-nfOCXz8C_PB7gfIQfQQ6MqNydPrxlmiH0m_7adMRiHQg_IJJuklha6_zoGus7KW9KzgtqyzRdnBSjPkl8UZ_0n2lwbdFUFF-OcbeovwRGpAjHe_5vIIw_nDLCWhT5H6-qofl6-vlrOABL_vbt5GTAZc0senrGUe0z_ZxAO1yKJdbFTgP4V4p9z6PpRC6YlYUidLKTgXMNZQVt_yZFia9tOF600tUM2dQ1imyYw-lJxxhOqOvZgDUdcFIbKxuZK2wss',
    'AI-Powered Personal Stylist UI',
    'Users struggle to find clothes that match their style and body type.',
    'An app that uses AI to analyze user photos and preferences to recommend outfits from online retailers.',
    'Fashion-conscious individuals aged 18-35 who shop online.',
    '["AI-powered style analysis", "Personalized outfit recommendations", "Direct links to purchase items"]'::jsonb,
    95,
    true,
    '2024-01-15 10:00:00+00'
),
(
    'HealthPal Nutrition Planner',
    'healthpal-nutrition-planner',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD7dW-941O2WLo-vmRoYzPuhCOBxQeiK3bE3RCbFwl5KgmNmfZGaioRCjiEEiIhhvKZnz_sk2aeAXSEMLlJzwwuJ8omlE3X8RAbfmhH8BL3R8E7IXxJ9HVGdvPFDzLOxv2QNpSrYvHNMthacjhpI4CaWnt-KQ_6AAx1cdWAH4ibgIDfH1Zwt4c5Fyx6kWv8dC1mFPY2KtJg0-ss3gD9aXYmc27w_qr2fAoE1vvMIAEfVWumWvrm6SM15S_VTq0SLj_HlGtPDsCM0MOq',
    'HealthPal Nutrition Planner UI',
    'Creating personalized and healthy meal plans is time-consuming and confusing.',
    'A mobile app that generates weekly meal plans based on dietary goals, allergies, and food preferences.',
    'Individuals focused on fitness, weight loss, or managing dietary restrictions.',
    '["Personalized meal planning", "Dietary restriction support", "Nutritional tracking"]'::jsonb,
    88,
    true,
    '2024-01-14 09:00:00+00'
),
(
    'DevFlow Code Assistant',
    'devflow-code-assistant',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB4KGrG20vSRmHIMHFVDOpCwjMe6CzhvUOkWkhmxGoB8kNY-0iBRuiN1CEGBSjRqg1XKtE9DpF3z5CUqxS3dgFM7XdlkoZ698tWp_eZqxrlHbtFZCvCBifwKtkMd4aD67RFFUWF_0PG_3pBxmMCnyiwv61oqAwSjYbUgMwjzFHWtRNn4kL-l3zfBbKzQAutc1FrQ2YCUG9BjQfBb-15CL7EWvcT9xIwizu6uwjm7mW3JJp7fV5GGTmfG77vhqJCfbw3WhOg56hc_lxY',
    'DevFlow Code Assistant UI',
    'Developers spend too much time on boilerplate code and debugging common errors.',
    'A smart IDE plugin that provides contextual code completions, refactoring suggestions, and automated bug detection.',
    'Software developers and engineering teams looking to boost productivity.',
    '["Contextual code completions", "Automated refactoring", "Bug detection and fixes"]'::jsonb,
    92,
    true,
    '2024-01-13 08:00:00+00'
),
(
    'PocketFinance Tracker',
    'pocketfinance-tracker',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDh8l7C6vBtrSSRWA09CWYwJXFn-C3DPQF1ixHGCl5_Yk1-T08JntxntZMuKXaR-vM4ZLAb0793YOfrplq3VDoa6aS-ub-WEqZq1GBsBeldEWovbQuFPjKdDqkivnNemxWwlRZjXDUjXJzGTCD9Pds83OgLBKMNSVsow6Bq_r1TGOr-2TXg0k425tnFSksWzpu3p1ZybupqHTuqrS3ly0cpJAf_daeYqUo26bR2uMv_q35c4RjveOROawf71ut7BQemo32K_24R9gSW',
    'PocketFinance Tracker UI',
    'Young adults find personal finance and budgeting overwhelming and difficult to manage.',
    'An intuitive app that gamifies saving, automates expense tracking, and offers simple investment advice.',
    'Millennials and Gen Z looking to improve their financial literacy and habits.',
    '["Gamified savings goals", "Automated expense tracking", "Investment recommendations"]'::jsonb,
    85,
    true,
    '2024-01-12 07:00:00+00'
),
(
    'EcoRoute Delivery Optimizer',
    'ecoroute-delivery-optimizer',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBxcioLppUHOktql95DkumCRS24uh-5HMKZeNkhmGSK1-4RHfSUyryAgQ6B3ZT0POKDiuNSbr_4wNYvmyaOxUBi38s29ms8aEZzEusDkU3bCHwEhWeqdLNrldwyZ2HUjF-kL05jn4tSu4WOLUnOORlSLDyEA3wgNDOgl1PEku30QJQdZDqDFO1oYkuvSkQTlrA679ELN1vHdtTZMX0NTP4_-yMLNqsYofCpHY9iirfP8AL_ZvGym6iKVTjAKgGaXPjWPrKUasBTDDIZ',
    'EcoRoute Delivery Optimizer UI',
    'Delivery businesses face high fuel costs and carbon emissions due to inefficient routing.',
    'AI-powered software that calculates the most fuel-efficient routes in real-time based on traffic and delivery schedules.',
    'Small to medium-sized logistics companies and e-commerce businesses with local delivery fleets.',
    '["Real-time route optimization", "Fuel cost reduction", "Carbon footprint tracking"]'::jsonb,
    78,
    true,
    '2024-01-11 06:00:00+00'
),
(
    'LearnSphere VR Classroom',
    'learnsphere-vr-classroom',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDl8UGv7fWl4ryoRSPweN_Ad58OO3n2eVn4bURDm_8uP25-rZ5M4tt2pngxtA6rqIWtf0G-zalN6mimqpaYoLU3b2O9eEFPZtrcVa_w9ycmbDXALEJZFVja7onCbx9Zj7qT56OrOEAsG3tqrsXj5iGC0LEnKo5hQTSVR_Gh96x21ysG6HSS2Z4uy3puuR5wxAgLrsg23USWVdmnftSj5I2MFGLUMQzY8dF3gZAJ14naQKt_8g-7spfqcACPtKRBvJTYbgXULvm1BDgF',
    'LearnSphere VR Classroom UI',
    'Online learning can be disengaging and lacks the immersive quality of in-person classes.',
    'A virtual reality platform for interactive lessons, virtual field trips, and collaborative student projects.',
    'Educational institutions and corporate training programs seeking innovative teaching methods.',
    '["Immersive VR lessons", "Virtual field trips", "Collaborative workspaces"]'::jsonb,
    82,
    true,
    '2024-01-10 05:00:00+00'
);

-- Link sample ideas to categories
-- AI-Powered Personal Stylist: AI, E-commerce
INSERT INTO idea_categories (idea_id, category_id)
SELECT i.id, c.id FROM ideas i, categories c
WHERE i.slug = 'ai-powered-personal-stylist' AND c.slug = 'ai';
INSERT INTO idea_categories (idea_id, category_id)
SELECT i.id, c.id FROM ideas i, categories c
WHERE i.slug = 'ai-powered-personal-stylist' AND c.slug = 'ecommerce';

-- HealthPal Nutrition Planner: HealthTech, Mobile App
INSERT INTO idea_categories (idea_id, category_id)
SELECT i.id, c.id FROM ideas i, categories c
WHERE i.slug = 'healthpal-nutrition-planner' AND c.slug = 'healthtech';
INSERT INTO idea_categories (idea_id, category_id)
SELECT i.id, c.id FROM ideas i, categories c
WHERE i.slug = 'healthpal-nutrition-planner' AND c.slug = 'mobile-app';

-- DevFlow Code Assistant: Developer Tools, SaaS
INSERT INTO idea_categories (idea_id, category_id)
SELECT i.id, c.id FROM ideas i, categories c
WHERE i.slug = 'devflow-code-assistant' AND c.slug = 'developer-tools';
INSERT INTO idea_categories (idea_id, category_id)
SELECT i.id, c.id FROM ideas i, categories c
WHERE i.slug = 'devflow-code-assistant' AND c.slug = 'saas';

-- PocketFinance Tracker: FinTech, Mobile App
INSERT INTO idea_categories (idea_id, category_id)
SELECT i.id, c.id FROM ideas i, categories c
WHERE i.slug = 'pocketfinance-tracker' AND c.slug = 'fintech';
INSERT INTO idea_categories (idea_id, category_id)
SELECT i.id, c.id FROM ideas i, categories c
WHERE i.slug = 'pocketfinance-tracker' AND c.slug = 'mobile-app';

-- EcoRoute Delivery Optimizer: Logistics, SaaS
INSERT INTO idea_categories (idea_id, category_id)
SELECT i.id, c.id FROM ideas i, categories c
WHERE i.slug = 'ecoroute-delivery-optimizer' AND c.slug = 'logistics';
INSERT INTO idea_categories (idea_id, category_id)
SELECT i.id, c.id FROM ideas i, categories c
WHERE i.slug = 'ecoroute-delivery-optimizer' AND c.slug = 'saas';

-- LearnSphere VR Classroom: EdTech, VR
INSERT INTO idea_categories (idea_id, category_id)
SELECT i.id, c.id FROM ideas i, categories c
WHERE i.slug = 'learnsphere-vr-classroom' AND c.slug = 'edtech';
INSERT INTO idea_categories (idea_id, category_id)
SELECT i.id, c.id FROM ideas i, categories c
WHERE i.slug = 'learnsphere-vr-classroom' AND c.slug = 'vr';

-- -----------------------------------------------------------------------------
-- Utility Views (Optional)
-- -----------------------------------------------------------------------------

-- View: Published ideas with categories as JSON array
CREATE OR REPLACE VIEW ideas_with_categories AS
SELECT
    i.id,
    i.title,
    i.slug,
    i.image_url,
    i.image_alt,
    i.problem,
    i.solution,
    i.target_users,
    i.key_features,
    i.prd_content,
    i.popularity_score,
    i.view_count,
    i.is_published,
    i.published_at,
    i.created_at,
    i.updated_at,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'label', c.name,
                'variant', c.color_variant
            )
            ORDER BY c.display_order
        ) FILTER (WHERE c.id IS NOT NULL),
        '[]'::jsonb
    ) AS categories
FROM ideas i
LEFT JOIN idea_categories ic ON ic.idea_id = i.id
LEFT JOIN categories c ON c.id = ic.category_id
GROUP BY i.id;

COMMENT ON VIEW ideas_with_categories IS 'Convenience view joining ideas with their categories as JSONB array';

-- -----------------------------------------------------------------------------
-- End of Schema
-- -----------------------------------------------------------------------------
