-- Simplified schema for dbdiagram.io PostgreSQL import
-- Use: Import > PostgreSQL > paste this file

CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    color_variant TEXT NOT NULL DEFAULT 'secondary',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE ideas (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    image_url TEXT NOT NULL,
    image_alt TEXT NOT NULL DEFAULT '',
    problem TEXT NOT NULL,
    solution TEXT NOT NULL,
    target_users TEXT NOT NULL,
    key_features JSONB NOT NULL DEFAULT '[]',
    prd_content JSONB,
    popularity_score INTEGER NOT NULL DEFAULT 0,
    view_count BIGINT NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE idea_categories (
    idea_id BIGINT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (idea_id, category_id)
);
