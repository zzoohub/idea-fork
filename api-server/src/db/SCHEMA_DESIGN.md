# Database Architecture - Idea Fork

## Overview

Idea Fork is an AI-powered platform that generates daily product ideas with comprehensive PRDs. This document describes the PostgreSQL database schema designed to support the MVP features while remaining extensible for future growth.

## Design Principles

1. **BIGINT for all primary keys** - Future-proof, avoids integer overflow
2. **TIMESTAMPTZ everywhere** - All timestamps stored in UTC with timezone awareness
3. **Soft deletes disabled for MVP** - Simple hard deletes; can add soft deletes later if needed
4. **Categories as separate table** - Normalized for consistency and easy management
5. **JSONB for structured PRD content** - Flexible schema for AI-generated content sections
6. **TEXT over VARCHAR** - Same performance in PostgreSQL, more flexible

---

## Entity Relationship Diagram

```
+------------------+       +--------------------+       +------------------+
|     categories   |       |    idea_categories |       |      ideas       |
+------------------+       +--------------------+       +------------------+
| id (PK)          |<------| category_id (FK)   |------>| id (PK)          |
| name             |       | idea_id (FK)       |       | title            |
| slug             |       | created_at         |       | slug             |
| color_variant    |       +--------------------+       | image_url        |
| display_order    |                                    | image_alt        |
| created_at       |                                    | problem          |
| updated_at       |                                    | solution         |
+------------------+                                    | target_users     |
                                                        | key_features     |
                                                        | prd_content      |
                                                        | popularity_score |
                                                        | view_count       |
                                                        | is_published     |
                                                        | published_at     |
                                                        | created_at       |
                                                        | updated_at       |
                                                        +------------------+
```

---

## Core Entities

### ideas

**Purpose:** Stores AI-generated product ideas with their core content and metadata.

**Key Design Decisions:**

- `slug` for SEO-friendly URLs (unique, indexed)
- `key_features` stored as JSONB array for flexibility
- `prd_content` as JSONB for structured but flexible PRD sections
- `popularity_score` denormalized for fast sorting (0-100 scale)
- `view_count` for tracking engagement (updated via application)
- `is_published` flag to support draft/published workflow
- Full-text search index on title, problem, solution fields

**Access Patterns:**

- List published ideas ordered by date (homepage feed)
- List published ideas ordered by popularity
- Search ideas by keywords
- Filter ideas by category
- Get single idea by slug or ID (detail page)

### categories

**Purpose:** Predefined categories for classifying ideas (AI, SaaS, E-commerce, etc.)

**Key Design Decisions:**

- `slug` for URL-safe identifiers
- `color_variant` matches frontend badge variants (primary, teal, orange, indigo, secondary)
- `display_order` for custom sorting in UI
- Seeded with initial categories, admin can add more later

**Access Patterns:**

- List all categories (for filter dropdown)
- Get category by slug
- Get ideas by category

### idea_categories (Junction Table)

**Purpose:** Many-to-many relationship between ideas and categories.

**Key Design Decisions:**

- Composite primary key (idea_id, category_id)
- CASCADE delete on both foreign keys
- Index on category_id for reverse lookups

---

## Table Designs

### ideas

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, GENERATED ALWAYS AS IDENTITY | Unique identifier |
| title | TEXT | NOT NULL | Product idea title |
| slug | TEXT | NOT NULL, UNIQUE | URL-safe identifier |
| image_url | TEXT | NOT NULL | Thumbnail image URL |
| image_alt | TEXT | NOT NULL, DEFAULT '' | Image alt text for accessibility |
| problem | TEXT | NOT NULL | Problem statement |
| solution | TEXT | NOT NULL | Proposed solution |
| target_users | TEXT | NOT NULL | Target user description |
| key_features | JSONB | NOT NULL, DEFAULT '[]' | Array of 3 key features |
| prd_content | JSONB | | Full PRD content (structured sections) |
| popularity_score | INTEGER | NOT NULL, DEFAULT 0, CHECK 0-100 | Denormalized popularity metric |
| view_count | BIGINT | NOT NULL, DEFAULT 0 | Page view counter |
| is_published | BOOLEAN | NOT NULL, DEFAULT false | Publication status |
| published_at | TIMESTAMPTZ | | When idea was published |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |

### categories

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, GENERATED ALWAYS AS IDENTITY | Unique identifier |
| name | TEXT | NOT NULL, UNIQUE | Display name (e.g., "E-commerce") |
| slug | TEXT | NOT NULL, UNIQUE | URL-safe identifier (e.g., "ecommerce") |
| color_variant | TEXT | NOT NULL, DEFAULT 'secondary' | Badge color variant |
| display_order | INTEGER | NOT NULL, DEFAULT 0 | Sort order in UI |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |

### idea_categories

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| idea_id | BIGINT | PK, FK -> ideas.id ON DELETE CASCADE | Reference to idea |
| category_id | BIGINT | PK, FK -> categories.id ON DELETE CASCADE | Reference to category |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When association was created |

---

## PRD Content Structure (JSONB)

The `prd_content` column stores the full PRD as structured JSONB:

```json
{
  "executive_summary": "Brief overview of the product idea...",
  "market_analysis": {
    "market_size": "...",
    "trends": ["..."],
    "competitors": ["..."]
  },
  "user_personas": [
    {
      "name": "Sarah the Startup Founder",
      "description": "...",
      "pain_points": ["..."],
      "goals": ["..."]
    }
  ],
  "features": [
    {
      "name": "Feature Name",
      "description": "...",
      "priority": "high|medium|low",
      "user_stories": ["..."]
    }
  ],
  "tech_stack": {
    "frontend": ["React", "Next.js"],
    "backend": ["Python", "FastAPI"],
    "database": ["PostgreSQL"],
    "infrastructure": ["AWS", "Vercel"]
  },
  "mvp_roadmap": [
    {
      "phase": 1,
      "name": "Foundation",
      "duration": "4 weeks",
      "deliverables": ["..."]
    }
  ],
  "success_metrics": [
    {
      "metric": "Monthly Active Users",
      "target": "10,000",
      "timeframe": "6 months"
    }
  ]
}
```

---

## Indexing Strategy

### Primary Indexes (Auto-created)

| Index | Table | Type |
|-------|-------|------|
| ideas_pkey | ideas | B-tree on id |
| categories_pkey | categories | B-tree on id |
| idea_categories_pkey | idea_categories | B-tree on (idea_id, category_id) |

### Unique Indexes

| Index | Table | Column(s) | Purpose |
|-------|-------|-----------|---------|
| ideas_slug_key | ideas | slug | URL lookups |
| categories_name_key | categories | name | Prevent duplicates |
| categories_slug_key | categories | slug | URL lookups |

### Query Indexes

| Index | Table | Column(s) | Purpose |
|-------|-------|-----------|---------|
| ideas_published_at_idx | ideas | (is_published, published_at DESC) | Feed listing by date |
| ideas_popularity_idx | ideas | (is_published, popularity_score DESC) | Feed listing by popularity |
| ideas_title_idx | ideas | title | Alphabetical sorting |
| idea_categories_category_id_idx | idea_categories | category_id | Filter by category |

### Full-Text Search Index

| Index | Table | Type | Purpose |
|-------|-------|------|---------|
| ideas_search_idx | ideas | GIN on tsvector | Keyword search |

---

## Query Patterns

### 1. List Published Ideas (Feed)

```sql
-- Newest first (default)
SELECT i.*,
       COALESCE(
         jsonb_agg(
           jsonb_build_object('label', c.name, 'variant', c.color_variant)
         ) FILTER (WHERE c.id IS NOT NULL),
         '[]'
       ) AS categories
FROM ideas i
LEFT JOIN idea_categories ic ON ic.idea_id = i.id
LEFT JOIN categories c ON c.id = ic.category_id
WHERE i.is_published = true
GROUP BY i.id
ORDER BY i.published_at DESC
LIMIT 20;

-- Most popular
ORDER BY i.popularity_score DESC, i.published_at DESC

-- Alphabetical
ORDER BY i.title ASC
```

### 2. Filter by Category

```sql
SELECT i.*, ...
FROM ideas i
JOIN idea_categories ic ON ic.idea_id = i.id
JOIN categories c ON c.id = ic.category_id
WHERE i.is_published = true
  AND c.slug = 'saas'
GROUP BY i.id
ORDER BY i.published_at DESC;
```

### 3. Keyword Search

```sql
SELECT i.*, ts_rank(i.search_vector, query) AS rank
FROM ideas i,
     to_tsquery('english', 'ai & health') AS query
WHERE i.is_published = true
  AND i.search_vector @@ query
ORDER BY rank DESC;
```

### 4. Get Single Idea

```sql
SELECT i.*,
       COALESCE(
         jsonb_agg(
           jsonb_build_object('label', c.name, 'variant', c.color_variant)
         ) FILTER (WHERE c.id IS NOT NULL),
         '[]'
       ) AS categories
FROM ideas i
LEFT JOIN idea_categories ic ON ic.idea_id = i.id
LEFT JOIN categories c ON c.id = ic.category_id
WHERE i.slug = 'ai-powered-personal-stylist'
GROUP BY i.id;
```

### 5. Cursor-Based Pagination

```sql
-- First page
SELECT i.*, ...
FROM ideas i
WHERE i.is_published = true
ORDER BY i.published_at DESC, i.id DESC
LIMIT 20;

-- Next page (using last item's values)
SELECT i.*, ...
FROM ideas i
WHERE i.is_published = true
  AND (i.published_at, i.id) < ('2024-01-15 10:00:00+00', 123)
ORDER BY i.published_at DESC, i.id DESC
LIMIT 20;
```

---

## Denormalization Log

| Table.Column | Source | Sync Method | Rationale |
|--------------|--------|-------------|-----------|
| ideas.popularity_score | Engagement metrics | Application logic | Fast sorting without complex aggregation |
| ideas.view_count | Page views | Application increment | Track engagement |
| ideas.search_vector | title, problem, solution | Trigger on INSERT/UPDATE | Full-text search performance |

---

## Migration Strategy

### Initial Setup (MVP)

1. Create extensions (pg_trgm for future fuzzy search)
2. Create categories table
3. Create ideas table with all indexes
4. Create idea_categories junction table
5. Seed initial categories
6. Insert sample data (optional)

### Future Migrations

When adding new features, follow these patterns:

**Adding nullable column:**
```sql
ALTER TABLE ideas ADD COLUMN new_column TEXT;
```

**Adding NOT NULL column:**
```sql
-- Step 1: Add as nullable
ALTER TABLE ideas ADD COLUMN new_column TEXT;

-- Step 2: Backfill data
UPDATE ideas SET new_column = 'default_value' WHERE new_column IS NULL;

-- Step 3: Add NOT NULL constraint
ALTER TABLE ideas ALTER COLUMN new_column SET NOT NULL;
```

**Adding index:**
```sql
-- Always use CONCURRENTLY in production
CREATE INDEX CONCURRENTLY ideas_new_column_idx ON ideas(new_column);
```

---

## Scale Considerations

**Current Assumptions:**
- ~1,000 ideas (1-3 per day for 1-2 years)
- ~50 categories
- ~10,000 page views/day

**When to Revisit:**
- Ideas > 100K: Consider partitioning by created_at
- High search volume: Consider dedicated search service (Elasticsearch/Meilisearch)
- User-generated content: Add users table and authentication

---

## Security Considerations

- No PII in MVP (no user accounts yet)
- All content is public (no row-level security needed)
- SQL injection prevention via parameterized queries (application layer)
- Input validation for slugs and URLs (application layer)

---

## Future Extensions

### Phase 2: User Accounts

```sql
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User bookmarks
CREATE TABLE user_bookmarks (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    idea_id BIGINT REFERENCES ideas(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, idea_id)
);
```

### Phase 3: User Submissions

```sql
ALTER TABLE ideas ADD COLUMN submitted_by BIGINT REFERENCES users(id);
ALTER TABLE ideas ADD COLUMN is_ai_generated BOOLEAN NOT NULL DEFAULT true;
```

### Phase 4: Comments and Ratings

```sql
CREATE TABLE idea_comments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idea_id BIGINT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE idea_ratings (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    idea_id BIGINT REFERENCES ideas(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, idea_id)
);
```
