---
name: data-modeling
description: Data modeling principles for designing database schemas from business requirements. Covers entity extraction, relationship analysis, normalization strategies, and DBML schema documentation. Use when starting new projects or designing major features.
---

# Data Modeling

Transform business requirements into well-structured, scalable database schemas.

## When to Use This Skill

- Starting a new project with PRD/requirements
- Designing database for new features
- Reviewing and refactoring existing data structures
- Documenting database architecture decisions

## Deliverables

When designing a data model, produce:

1. **schema.dbml** - Schema definition in DBML format
2. **ARCHITECTURE.md** - Design decisions, rationale, and future considerations

---

## 1. Entity Extraction

### From Requirements to Entities

**Step 1: Identify Nouns**

```
PRD: "Users can create posts. Posts can have multiple tags. 
      Users can comment on posts and like them."

Nouns found:
- Users ✓
- Posts ✓
- Tags ✓
- Comments ✓
- Likes ✓
```

**Step 2: Validate Each Entity**

For each noun, ask:

| Question | If No |
|----------|-------|
| Does it have its own identity (ID)? | Probably an attribute, not entity |
| Does it have multiple attributes? | Might be just a column |
| Will you query it independently? | Consider embedding instead |
| Does it change independently? | If always changes with parent, embed it |

**Step 3: Define Attributes**

For each attribute, determine:

```
Required vs Optional:
- email: required (can't function without it)
- phone: optional (nice to have)

Mutable vs Immutable:
- created_at: immutable (never changes)
- status: mutable (changes over time)

Unique vs Non-unique:
- email: unique (business constraint)
- name: non-unique (people share names)
```

### Critical Questions Before Modeling

Ask these BEFORE designing:

1. **What are the most frequent queries?** (Design for reads)
2. **What's the write vs read ratio?** (Affects normalization)
3. **What's the expected data volume?** (Affects partitioning)
4. **What consistency guarantees are needed?** (Affects transaction boundaries)
5. **What are the reporting requirements?** (May need denormalization)

---

## 2. Relationship Analysis

### Determining Relationship Types

| Question | Answer | Type |
|----------|--------|------|
| Can A have multiple B? Can B have multiple A? | Yes to both | N:M |
| Can A have multiple B? Can B have only one A? | Yes, No | 1:N |
| Can A have only one B? Can B have only one A? | Yes to both | 1:1 |

### 1:N Relationships

```dbml
// User has many Posts
Table users {
  id bigint [pk, increment]
}

Table posts {
  id bigint [pk, increment]
  user_id bigint [not null, ref: > users.id]
  
  indexes {
    user_id  // CRITICAL: Always index foreign keys
  }
}
```

**Critical Considerations:**
- Always index the foreign key column
- Decide ON DELETE behavior upfront (CASCADE vs RESTRICT vs SET NULL)
- Consider if relationship is required (NOT NULL) or optional

### N:M Relationships

```dbml
// Posts have many Tags, Tags have many Posts
Table posts {
  id bigint [pk, increment]
}

Table tags {
  id bigint [pk, increment]
  name varchar [unique, not null]
}

Table post_tags {
  post_id bigint [not null, ref: > posts.id, delete: cascade]
  tag_id bigint [not null, ref: > tags.id, delete: cascade]
  
  indexes {
    (post_id, tag_id) [pk]  // Composite primary key
    tag_id  // For reverse lookups (tags → posts)
  }
}
```

**Critical Considerations:**
- Junction table needs indexes on BOTH foreign keys
- Consider if junction table needs extra attributes (created_at, created_by, sort_order)
- Decide if duplicates are allowed (composite PK prevents them)

### 1:1 Relationships

```dbml
// User has one Profile (optional)
Table users {
  id bigint [pk, increment]
}

Table user_profiles {
  user_id bigint [pk, ref: - users.id, delete: cascade]
  bio text
  website varchar
}
```

**When to Use 1:1:**
- Separate frequently vs rarely accessed data
- Optional data that most records won't have
- Data with different security requirements
- Columns that would make main table too wide

**Warning:** Often a 1:1 should just be columns on the main table. Don't over-normalize.

### ON DELETE Actions

| Action | Use When | Example |
|--------|----------|---------|
| CASCADE | Child meaningless without parent | posts → user |
| SET NULL | Child can exist independently | posts → category |
| RESTRICT | Prevent accidental deletion | orders → user |

**Critical Rule:** Default to RESTRICT, use CASCADE only when you're certain.

---

## 3. Normalization Strategy

### Quick Reference

| Form | Rule | Violation Example |
|------|------|-------------------|
| 1NF | No repeating groups, atomic values | `tags: "a,b,c"` in one column |
| 2NF | No partial dependencies | `order_items.product_name` (depends on product, not order) |
| 3NF | No transitive dependencies | `orders.customer_city` (depends on customer, not order) |

### When to Stay Normalized (3NF)

- Write-heavy workloads
- Data consistency is critical
- Data changes frequently
- Storage cost matters
- Multiple applications access same data

### When to Denormalize

- Read-heavy workloads (>90% reads)
- Query performance is critical
- Data rarely changes after creation
- Reporting/analytics queries
- Reducing JOIN complexity

### Safe Denormalization Patterns

**Pattern 1: Cached Counts**

```dbml
Table users {
  id bigint [pk]
  posts_count integer [not null, default: 0, note: 'Denormalized. Update via trigger or app.']
}
```

When: Displaying counts frequently, count queries are slow

**Pattern 2: Snapshot Data**

```dbml
Table order_items {
  id bigint [pk]
  product_id bigint [ref: > products.id]
  
  // Snapshot at time of order (don't change if product changes)
  product_name varchar [not null]
  product_price numeric [not null]
}
```

When: Historical accuracy required, source data changes

**Pattern 3: Computed Columns**

```dbml
Table orders {
  id bigint [pk]
  subtotal numeric [not null]
  tax numeric [not null]
  total numeric [not null, note: 'Denormalized: subtotal + tax']
}
```

When: Frequently accessed computed values

**Critical Rule:** Document EVERY denormalization:
- Why it exists
- How it's kept in sync
- What happens if it's wrong

---

## 4. DBML Schema Format

### Complete Example

```dbml
// Enums
Enum user_role {
  user
  admin
  moderator
}

Enum post_status {
  draft
  published
  archived
}

// Core Tables
Table users {
  id bigint [pk, increment]
  email varchar(255) [unique, not null]
  name varchar(100) [not null]
  role user_role [not null, default: 'user']
  
  // Timestamps
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  deleted_at timestamptz [note: 'Soft delete']
  
  indexes {
    email [unique]
    created_at [type: brin]
  }
  
  Note: 'Core user accounts. Soft delete enabled for data retention.'
}

Table posts {
  id bigint [pk, increment]
  user_id bigint [not null]
  
  title varchar(255) [not null]
  slug varchar(255) [not null]
  content text
  excerpt varchar(500) [note: 'Denormalized: first 500 chars of content']
  
  status post_status [not null, default: 'draft']
  published_at timestamptz
  
  // Denormalized counts
  comments_count integer [not null, default: 0]
  likes_count integer [not null, default: 0]
  
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  
  indexes {
    user_id
    slug [unique]
    status
    published_at
    (user_id, status) [name: 'posts_user_status_idx']
  }
  
  Note: 'Blog posts with publishing workflow.'
}

// Relationships
Ref: posts.user_id > users.id [delete: cascade]

// Junction Tables
Table post_tags {
  post_id bigint [not null]
  tag_id bigint [not null]
  created_at timestamptz [not null, default: `now()`]
  
  indexes {
    (post_id, tag_id) [pk]
    tag_id
  }
}

Ref: post_tags.post_id > posts.id [delete: cascade]
Ref: post_tags.tag_id > tags.id [delete: cascade]

Table tags {
  id bigint [pk, increment]
  name varchar(50) [unique, not null]
  slug varchar(50) [unique, not null]
  posts_count integer [not null, default: 0, note: 'Denormalized count']
}

// Table Groups for Organization
TableGroup auth {
  users
}

TableGroup content {
  posts
  tags
  post_tags
}
```

### DBML Syntax Reference

```dbml
// Primary Key
id bigint [pk, increment]           // Auto-increment
id uuid [pk, default: `gen_random_uuid()`]  // UUID

// References
user_id bigint [ref: > users.id]                    // Inline
Ref: posts.user_id > users.id                       // Separate line
Ref: posts.user_id > users.id [delete: cascade]     // With action

// Constraints
email varchar [unique, not null]
price numeric [not null, default: 0]
status varchar [not null, default: 'active']

// Indexes
indexes {
  email                              // Single column
  (user_id, created_at)              // Composite
  email [unique]                     // Unique index
  created_at [type: brin]            // Index type
  (first_name, last_name) [name: 'users_name_idx']  // Named
}

// Notes
Table users {
  Note: 'Table description'
}
column_name varchar [note: 'Column description']
```

---

## 5. Architecture Documentation

### ARCHITECTURE.md Template

```markdown
# Database Architecture

## Overview

[One paragraph describing what this database supports]

## Design Principles

1. [Key principle, e.g., "Soft deletes for all user-generated content"]
2. [Key principle, e.g., "UTC timestamps everywhere"]
3. [Key principle, e.g., "Denormalize counts for frequently displayed metrics"]

## Entity Relationship Diagram

![ERD](./erd.png)
[Or link to dbdiagram.io]

## Core Entities

### Users
**Purpose:** [What this entity represents]

**Key Design Decisions:**
- [Decision 1 and why]
- [Decision 2 and why]

**Access Patterns:**
- Get user by email (login)
- Get user by ID (profile)
- List users with pagination (admin)

### Posts
**Purpose:** [What this entity represents]

**Key Design Decisions:**
- Soft delete: No (posts can be permanently deleted)
- Denormalized: excerpt, comments_count, likes_count
- Status workflow: draft → published → archived

**Access Patterns:**
- List published posts by date (homepage)
- Get post by slug (post page)
- List user's posts by status (dashboard)

## Relationships

| Relationship | Type | On Delete | Rationale |
|--------------|------|-----------|-----------|
| users → posts | 1:N | CASCADE | Posts meaningless without author |
| posts ↔ tags | N:M | CASCADE | Remove associations on delete |

## Denormalization Log

| Table.Column | Source | Sync Method | Rationale |
|--------------|--------|-------------|-----------|
| posts.excerpt | posts.content | App on save | Avoid text processing on read |
| posts.comments_count | COUNT(comments) | Trigger | Displayed on every post listing |
| users.posts_count | COUNT(posts) | Trigger | Displayed on profile |

## Indexing Strategy

| Index | Supports Query | Notes |
|-------|----------------|-------|
| posts_user_id_idx | User's posts | FK index |
| posts_slug_idx | Post by slug | URL lookup |
| posts_user_status_idx | User's posts filtered by status | Dashboard |

## Scale Considerations

**Current assumptions:**
- ~10K users
- ~100K posts
- ~1M comments

**When to revisit:**
- Posts > 10M: Consider partitioning by created_at
- Comments > 100M: Consider separate service
- Global users: Consider read replicas by region

## Migration Strategy

- All migrations must be reversible
- Large data migrations run in batches
- Column renames use expand-contract pattern
- See `/migrations/README.md` for procedures

## Security Considerations

- PII columns: users.email, users.name
- No sensitive data in posts (public content)
- Row-level security: Users see only their own drafts
```

---

## 6. Common Patterns

### Soft Deletes

```dbml
Table posts {
  id bigint [pk]
  deleted_at timestamptz [note: 'NULL = active']
  
  indexes {
    deleted_at [note: 'Partial index WHERE deleted_at IS NULL recommended']
  }
}
```

**Use When:**
- Regulatory requirements (data retention)
- Undo functionality needed
- Audit trail required

**Don't Use When:**
- GDPR "right to be forgotten" required (need hard delete)
- Storage is concern
- Simple data with no recovery needs

**Critical:** Always filter `WHERE deleted_at IS NULL` in application queries.

### Audit Trail

```dbml
// Option 1: Audit columns (who changed it last)
Table orders {
  id bigint [pk]
  created_by bigint [ref: > users.id]
  updated_by bigint [ref: > users.id]
  created_at timestamptz [not null]
  updated_at timestamptz [not null]
}

// Option 2: History table (full change log)
Table orders_history {
  history_id bigint [pk, increment]
  order_id bigint [not null]
  
  // All columns from orders
  status varchar
  total numeric
  
  // Audit metadata
  changed_at timestamptz [not null]
  changed_by bigint
  operation varchar [not null, note: 'INSERT, UPDATE, DELETE']
  changes jsonb [note: 'What changed: {field: [old, new]}']
}
```

### Polymorphic Associations

```dbml
// Comments on multiple entity types
Table comments {
  id bigint [pk]
  
  commentable_type varchar [not null, note: 'post, product, article']
  commentable_id bigint [not null]
  
  content text [not null]
  
  indexes {
    (commentable_type, commentable_id)
  }
  
  Note: 'No FK constraint. Application enforces integrity.'
}
```

**Trade-off:** Flexibility vs referential integrity. No FK means database can't enforce validity.

**Alternative:** Separate tables (post_comments, product_comments) if referential integrity is critical.

### Hierarchical Data

```dbml
// Option 1: Adjacency List (simple, recursive queries)
Table categories {
  id bigint [pk]
  parent_id bigint [ref: > categories.id]
  name varchar [not null]
}

// Option 2: Materialized Path (fast reads, complex writes)
Table categories {
  id bigint [pk]
  path varchar [not null, note: '/1/4/7/']
  depth integer [not null]
  name varchar [not null]
  
  indexes {
    path [note: 'For LIKE queries']
  }
}

// Option 3: Closure Table (fast reads and writes, more storage)
Table category_tree {
  ancestor_id bigint [not null, ref: > categories.id]
  descendant_id bigint [not null, ref: > categories.id]
  depth integer [not null]
  
  indexes {
    (ancestor_id, descendant_id) [pk]
    descendant_id
  }
}
```

| Pattern | Read | Write | Storage | Use When |
|---------|------|-------|---------|----------|
| Adjacency | Slow (recursive) | Fast | Minimal | Shallow trees, rare reads |
| Materialized Path | Fast | Slow | Medium | Read-heavy, moderate depth |
| Closure Table | Fast | Medium | High | Need both fast reads and writes |

---

## 7. Critical Mistakes to Avoid

### Entity Design

❌ **No primary key strategy decided upfront**
→ Leads to inconsistency (some BIGINT, some UUID)

❌ **Using VARCHAR(255) everywhere**
→ Use TEXT for unbounded, specific length only when enforced

❌ **Storing money as FLOAT**
→ Use NUMERIC(precision, scale) for exact decimal math

❌ **Timestamps without timezone**
→ Always use TIMESTAMPTZ, store in UTC

### Relationships

❌ **Missing index on foreign key**
→ JOINs become full table scans

❌ **Wrong ON DELETE action**
→ CASCADE when it should RESTRICT = data loss
→ RESTRICT when it should CASCADE = orphaned references

❌ **N:M without considering order**
→ If order matters, add sort_order column to junction table

### Normalization

❌ **Over-normalizing**
→ If you always need data together, keep it together

❌ **Denormalizing without documentation**
→ Future devs won't know how to keep it in sync

❌ **Storing computed values that change frequently**
→ Sync overhead exceeds query savings

---

## 8. Design Checklist

### Before Starting
- [ ] Understood all business requirements
- [ ] Identified read vs write patterns
- [ ] Estimated data volumes (now and 2 years)
- [ ] Identified consistency requirements

### Entity Design
- [ ] Each entity has clear purpose
- [ ] Primary key strategy consistent
- [ ] Required vs optional fields defined
- [ ] Data types appropriate (not just VARCHAR(255))
- [ ] Timestamps use TIMESTAMPTZ

### Relationships
- [ ] All relationships identified
- [ ] Cardinality (1:1, 1:N, N:M) determined
- [ ] Foreign keys have indexes
- [ ] ON DELETE actions explicitly chosen
- [ ] Junction tables have proper composite keys

### Data Integrity
- [ ] NOT NULL on truly required fields
- [ ] UNIQUE constraints on natural keys
- [ ] CHECK constraints where applicable
- [ ] Default values for optional fields

### Performance
- [ ] Indexes support main query patterns
- [ ] Denormalization decisions documented
- [ ] Large table partitioning considered
- [ ] No obvious N+1 query traps

### Documentation
- [ ] schema.dbml complete and accurate
- [ ] ARCHITECTURE.md explains decisions
- [ ] Denormalization log maintained
- [ ] Migration strategy documented

---

## Related Skills

- For SQL implementation: `postgresql`
- For ORM usage: `fastapi`
- For API design: `api-design`
