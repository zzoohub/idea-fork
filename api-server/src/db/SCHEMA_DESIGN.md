# Idea Fork Database Schema Design

**Version:** 1.0
**Database:** PostgreSQL 15+
**Last Updated:** December 2024

---

## 1. Entity-Relationship Diagram (ERD)

### Overview

```
+------------------+       +----------------------+       +------------------+
|    categories    |       |   idea_categories    |       |      ideas       |
+------------------+       +----------------------+       +------------------+
| id (PK)          |<------| category_id (FK)     |------>| id (PK)          |
| name             |       | idea_id (FK)         |       | title            |
| slug             |       | created_at           |       | slug             |
| color            |       +----------------------+       | thumbnail_url    |
| description      |                                      | problem          |
| display_order    |                                      | solution         |
| is_active        |                                      | target_users     |
| created_at       |                                      | status           |
| updated_at       |                                      | generated_date   |
+------------------+                                      | view_count       |
                                                          | is_featured      |
                                                          | search_vector    |
                                                          | created_at       |
                                                          | updated_at       |
                                                          | deleted_at       |
                                                          +--------+---------+
                                                                   |
                                                                   | 1:1
                                                                   v
+------------------+       +----------------------+       +------------------+
|  idea_features   |       |    user_personas     |       |    idea_prds     |
+------------------+       +----------------------+       +------------------+
| id (PK)          |       | id (PK)              |       | id (PK)          |
| idea_id (FK)     |------>| prd_id (FK)          |<------| idea_id (FK) UQ  |
| title            |       | name                 |       | exec_summary     |
| description      |       | description          |       | problem_def      |
| display_order    |       | goals                |       | market_analysis  |
| created_at       |       | pain_points          |       | tech_stack       |
+------------------+       | display_order        |       | mvp_roadmap      |
                           | created_at           |       | success_metrics  |
                           +----------------------+       | pdf_url          |
                                                          | docx_url         |
                           +----------------------+       | created_at       |
                           |   prd_features       |       | updated_at       |
                           +----------------------+       +------------------+
                           | id (PK)              |              |
                           | prd_id (FK)          |<-------------+
                           | title                |
                           | description          |
                           | priority             |
                           | user_stories         |
                           | acceptance_criteria  |
                           | display_order        |
                           | created_at           |
                           +----------------------+

+------------------+       +----------------------+
| generation_logs  |       |    daily_stats       |
+------------------+       +----------------------+
| id (PK)          |       | id (PK)              |
| idea_id (FK)     |       | stats_date (UQ)      |
| ai_model         |       | ideas_generated      |
| prompt_version   |       | total_views          |
| generation_time  |       | unique_visitors      |
| tokens_used      |       | top_category_id      |
| raw_response     |       | created_at           |
| status           |       +----------------------+
| error_message    |
| created_at       |
+------------------+
```

---

## 2. Entity Descriptions

### 2.1 Core Entities

#### `categories`
Stores the predefined idea categories (SaaS, E-commerce, Social, Productivity, etc.).

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| name | VARCHAR(100) | Display name (e.g., "E-commerce") |
| slug | VARCHAR(100) | URL-friendly identifier (e.g., "e-commerce") |
| color | VARCHAR(20) | UI color theme (primary, teal, orange, indigo) |
| description | TEXT | Category description |
| display_order | SMALLINT | Sort order for UI display |
| is_active | BOOLEAN | Soft enable/disable |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Last modification timestamp |

#### `ideas`
The central entity storing all generated product ideas.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| title | VARCHAR(255) | Idea title |
| slug | VARCHAR(280) | URL-friendly unique identifier |
| thumbnail_url | TEXT | Image URL for card display |
| problem | TEXT | Problem statement |
| solution | TEXT | Proposed solution |
| target_users | TEXT | Target user description |
| status | idea_status | ENUM: draft, published, archived |
| generated_date | DATE | The day this idea was generated |
| view_count | INTEGER | Number of detail page views |
| is_featured | BOOLEAN | Whether to highlight this idea |
| search_vector | TSVECTOR | Full-text search index |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Last modification timestamp |
| deleted_at | TIMESTAMPTZ | Soft delete timestamp |

#### `idea_categories` (Junction Table)
Many-to-many relationship between ideas and categories.

| Column | Type | Description |
|--------|------|-------------|
| idea_id | BIGINT | FK to ideas.id |
| category_id | BIGINT | FK to categories.id |
| created_at | TIMESTAMPTZ | When association was created |

#### `idea_features`
Stores the 3 key features for each idea (as mentioned in PRD).

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| idea_id | BIGINT | FK to ideas.id |
| title | VARCHAR(255) | Feature title |
| description | TEXT | Feature description |
| display_order | SMALLINT | Order (1, 2, 3) |
| created_at | TIMESTAMPTZ | Record creation timestamp |

### 2.2 PRD (Product Requirements Document) Entities

#### `idea_prds`
Stores the comprehensive PRD for each idea (one-to-one with ideas).

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| idea_id | BIGINT | FK to ideas.id (UNIQUE) |
| executive_summary | TEXT | PRD executive summary |
| problem_definition | TEXT | Detailed problem definition |
| market_analysis | JSONB | Market analysis data |
| tech_stack | JSONB | Recommended technology stack |
| mvp_roadmap | JSONB | MVP development roadmap |
| success_metrics | JSONB | KPIs and success criteria |
| pdf_url | TEXT | Generated PDF download URL |
| docx_url | TEXT | Generated DOCX download URL |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Last modification timestamp |

#### `user_personas`
Stores user personas defined in the PRD.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| prd_id | BIGINT | FK to idea_prds.id |
| name | VARCHAR(100) | Persona name (e.g., "Tech-Savvy Professional") |
| description | TEXT | Persona description |
| goals | JSONB | Array of user goals |
| pain_points | JSONB | Array of pain points |
| display_order | SMALLINT | Display order |
| created_at | TIMESTAMPTZ | Record creation timestamp |

#### `prd_features`
Detailed feature descriptions within the PRD.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| prd_id | BIGINT | FK to idea_prds.id |
| title | VARCHAR(255) | Feature title |
| description | TEXT | Detailed description |
| priority | feature_priority | ENUM: must_have, should_have, could_have, wont_have |
| user_stories | JSONB | Array of user story objects |
| acceptance_criteria | JSONB | Array of acceptance criteria |
| display_order | SMALLINT | Display order |
| created_at | TIMESTAMPTZ | Record creation timestamp |

### 2.3 Operational Entities

#### `generation_logs`
Tracks AI generation events for debugging and analytics.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| idea_id | BIGINT | FK to ideas.id (nullable for failures) |
| ai_model | VARCHAR(100) | Model used (e.g., "gpt-4", "claude-3") |
| prompt_version | VARCHAR(50) | Prompt template version |
| generation_time_ms | INTEGER | Time taken in milliseconds |
| tokens_used | INTEGER | Total tokens consumed |
| raw_response | JSONB | Full AI response for debugging |
| status | generation_status | ENUM: success, failed, partial |
| error_message | TEXT | Error details if failed |
| created_at | TIMESTAMPTZ | When generation occurred |

#### `daily_stats`
Aggregated daily statistics for analytics dashboard.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| stats_date | DATE | The date (UNIQUE) |
| ideas_generated | SMALLINT | Count of ideas generated |
| total_views | INTEGER | Sum of all idea views |
| unique_visitors | INTEGER | Estimated unique visitors |
| top_category_id | BIGINT | Most viewed category |
| created_at | TIMESTAMPTZ | Record creation timestamp |

---

## 3. Relationships Summary

| Relationship | Type | Description |
|--------------|------|-------------|
| ideas <-> categories | Many-to-Many | Via `idea_categories` junction table |
| ideas -> idea_features | One-to-Many | Each idea has multiple key features |
| ideas -> idea_prds | One-to-One | Each idea has exactly one PRD |
| idea_prds -> user_personas | One-to-Many | PRD contains multiple personas |
| idea_prds -> prd_features | One-to-Many | PRD contains detailed features |
| ideas -> generation_logs | One-to-Many | Track generation attempts |
| categories -> daily_stats | Many-to-One | Reference to top category |

---

## 4. Design Decisions & Rationale

### 4.1 Data Type Choices

| Decision | Rationale |
|----------|-----------|
| **BIGSERIAL for PKs** | Supports 9.2 quintillion records; future-proof for high-growth scenarios |
| **TIMESTAMPTZ** | Always stores with timezone; prevents ambiguity in distributed systems |
| **JSONB for arrays** | Flexible schema for nested data (tech_stack, roadmap); GIN-indexable |
| **TSVECTOR for search** | Native PostgreSQL full-text search; faster than LIKE queries |
| **TEXT over VARCHAR** | PostgreSQL handles TEXT efficiently; avoids arbitrary length limits |
| **ENUM types** | Type safety and storage efficiency for fixed-value columns |

### 4.2 Normalization Strategy

- **3NF Base**: Core entities follow Third Normal Form
- **Controlled Denormalization**:
  - `view_count` on `ideas` (avoid COUNT queries)
  - `search_vector` on `ideas` (pre-computed for performance)
  - `daily_stats` (materialized aggregates)

### 4.3 Soft Delete Pattern

The `deleted_at` column on `ideas` enables:
- Data recovery capability
- Audit trail maintenance
- Referential integrity preservation
- Filtered queries via partial indexes

### 4.4 JSONB Fields

Used strategically for:
- **market_analysis**: Complex nested structure that varies by idea
- **tech_stack**: Array of technologies with metadata
- **mvp_roadmap**: Timeline with milestones and dependencies
- **user_stories**: Variable number of stories per feature
- **acceptance_criteria**: Variable criteria lists

---

## 5. Query Patterns Supported

### 5.1 Feed Display (Card-based listing)
```sql
SELECT i.*, array_agg(jsonb_build_object('name', c.name, 'color', c.color))
FROM ideas i
JOIN idea_categories ic ON i.id = ic.idea_id
JOIN categories c ON ic.category_id = c.id
WHERE i.deleted_at IS NULL AND i.status = 'published'
GROUP BY i.id
ORDER BY i.generated_date DESC, i.created_at DESC;
```

### 5.2 Category Filter
```sql
SELECT i.* FROM ideas i
JOIN idea_categories ic ON i.id = ic.idea_id
WHERE ic.category_id = $1 AND i.deleted_at IS NULL;
```

### 5.3 Full-Text Search
```sql
SELECT i.*, ts_rank(search_vector, query) as rank
FROM ideas i, plainto_tsquery('english', $1) query
WHERE search_vector @@ query AND deleted_at IS NULL
ORDER BY rank DESC;
```

### 5.4 Daily Ideas (1-3 per day)
```sql
SELECT * FROM ideas
WHERE generated_date = CURRENT_DATE AND deleted_at IS NULL;
```

### 5.5 Full Idea Detail with PRD
```sql
SELECT i.*, p.*,
  (SELECT jsonb_agg(f.*) FROM idea_features f WHERE f.idea_id = i.id) as features,
  (SELECT jsonb_agg(up.*) FROM user_personas up WHERE up.prd_id = p.id) as personas
FROM ideas i
LEFT JOIN idea_prds p ON i.id = p.idea_id
WHERE i.slug = $1 AND i.deleted_at IS NULL;
```

---

## 6. Index Strategy

### 6.1 Primary Indexes (Auto-created)
- All PRIMARY KEY columns
- All UNIQUE constraints

### 6.2 Foreign Key Indexes
- `idea_categories(idea_id)`
- `idea_categories(category_id)`
- `idea_features(idea_id)`
- `idea_prds(idea_id)`
- `user_personas(prd_id)`
- `prd_features(prd_id)`
- `generation_logs(idea_id)`

### 6.3 Query Optimization Indexes
- `ideas(generated_date DESC)` - Daily feed
- `ideas(status, deleted_at)` - Published ideas filter
- `ideas(search_vector)` - Full-text search (GIN)
- `categories(slug)` - Category URL lookup
- `categories(is_active, display_order)` - Active category listing
- `daily_stats(stats_date)` - Date-based stats lookup

### 6.4 Partial Indexes
- `ideas(generated_date) WHERE deleted_at IS NULL` - Only non-deleted
- `ideas(is_featured) WHERE is_featured = true AND deleted_at IS NULL` - Featured ideas

---

## 7. Future Considerations

### 7.1 Partitioning Strategy (when data grows)
```sql
-- Partition ideas by generated_date for efficient archival
CREATE TABLE ideas (
  ...
) PARTITION BY RANGE (generated_date);

CREATE TABLE ideas_2024 PARTITION OF ideas
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### 7.2 Potential Extensions
- **User accounts**: For bookmarking and preferences
- **Comments/Ratings**: Community feedback
- **Idea submissions**: User-contributed ideas
- **Version history**: Track PRD revisions
- **A/B testing**: Multiple thumbnail variants

### 7.3 Scalability Path
1. **Read replicas**: For search and feed queries
2. **Connection pooling**: PgBouncer for API servers
3. **Caching layer**: Redis for hot ideas and categories
4. **CDN**: For thumbnail and document delivery
