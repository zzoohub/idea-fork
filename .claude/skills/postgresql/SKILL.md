---
name: postgresql
description: PostgreSQL implementation patterns for writing efficient SQL, query optimization, indexing strategies, and safe migrations. Focus on performance, scalability, and production readiness. Use when writing queries, designing indexes, or planning migrations.
---

# PostgreSQL Patterns

Write efficient, maintainable PostgreSQL code optimized for production workloads.

## When to Use This Skill

- Writing SQL queries beyond basic CRUD
- Optimizing slow queries
- Designing indexing strategies
- Planning safe database migrations
- Debugging performance issues
- Production database operations

---

## 1. SQL Style Guide

### Naming Conventions

```sql
-- Tables: plural, snake_case
users, order_items, product_categories

-- Columns: singular, snake_case
user_id, created_at, is_active

-- Indexes: table_columns_idx
users_email_idx
orders_user_id_created_at_idx

-- Constraints: table_column_type
users_email_key        -- UNIQUE
orders_user_id_fkey    -- FOREIGN KEY
products_price_check   -- CHECK

-- Functions: verb_noun
get_user_orders(), calculate_total(), update_inventory()
```

### Query Formatting

```sql
-- Simple queries: compact
select id, name, email from users where id = 1;

-- Complex queries: structured with line breaks
select
    u.id,
    u.name,
    u.email,
    count(o.id) as order_count,
    sum(o.total) as total_spent
from users as u
left join orders as o on o.user_id = u.id
where u.is_active = true
    and u.created_at >= '2024-01-01'
    and u.deleted_at is null
group by u.id, u.name, u.email
having count(o.id) > 0
order by total_spent desc
limit 20;
```

### CTEs for Readability

```sql
-- Break complex logic into named, understandable steps
with active_users as (
    -- Step 1: Filter to active users only
    select id, name, email
    from users
    where is_active = true
        and deleted_at is null
),
user_order_stats as (
    -- Step 2: Aggregate order data per user
    select
        user_id,
        count(*) as order_count,
        sum(total) as total_spent,
        max(created_at) as last_order_at
    from orders
    where status = 'completed'
    group by user_id
),
user_engagement as (
    -- Step 3: Calculate engagement score
    select
        user_id,
        count(*) as login_count
    from user_sessions
    where created_at >= current_date - interval '30 days'
    group by user_id
)
-- Final: Combine all data
select
    au.id,
    au.name,
    au.email,
    coalesce(uos.order_count, 0) as order_count,
    coalesce(uos.total_spent, 0) as total_spent,
    uos.last_order_at,
    coalesce(ue.login_count, 0) as recent_logins
from active_users as au
left join user_order_stats as uos on uos.user_id = au.id
left join user_engagement as ue on ue.user_id = au.id
order by uos.total_spent desc nulls last;
```

**CTE Performance Note:** In PostgreSQL 12+, CTEs are inlined by default (optimization fence removed). For older versions or when you need materialization, use `WITH ... AS MATERIALIZED (...)`.

---

## 2. Query Optimization

### Reading EXPLAIN ANALYZE

```sql
explain (analyze, buffers, format text)
select * from orders where user_id = 123;
```

**Key Metrics to Watch:**

| Metric | Good | Bad | Action |
|--------|------|-----|--------|
| Seq Scan on large table | - | ✗ | Add index |
| Index Scan | ✓ | - | - |
| Index Only Scan | ✓✓ | - | Best case |
| Nested Loop (small) | ✓ | - | - |
| Nested Loop (large) | - | ✗ | Consider Hash Join |
| Sort (in-memory) | ✓ | - | - |
| Sort (on-disk) | - | ✗ | Increase work_mem or add index |
| Rows estimated vs actual | Close | 10x+ diff | Run ANALYZE |

**Warning Signs:**
- `actual rows` much different from `estimated rows` → Statistics outdated
- `Buffers: shared read` high → Data not in cache, may indicate missing index
- Multiple sequential scans in one query → Review query structure

### Common Anti-Patterns

**❌ Function on Indexed Column**
```sql
-- Can't use index on email
select * from users where lower(email) = 'test@example.com';

-- ✅ Fix: Expression index
create index users_email_lower_idx on users(lower(email));

-- ✅ Better: Store normalized data
-- Store email as lowercase, query directly
```

**❌ OR Conditions**
```sql
-- Often can't use indexes effectively
select * from orders 
where user_id = 1 or status = 'pending';

-- ✅ Fix: UNION (if both have indexes)
select * from orders where user_id = 1
union
select * from orders where status = 'pending' and user_id != 1;
```

**❌ SELECT ***
```sql
-- Fetches all columns, can't use Index Only Scan
select * from users where email = 'test@example.com';

-- ✅ Fix: Select only needed columns
select id, name, email from users where email = 'test@example.com';
```

**❌ NOT IN with Subquery**
```sql
-- Poor performance, NULL handling issues
select * from users 
where id not in (select user_id from banned_users);

-- ✅ Fix: NOT EXISTS or LEFT JOIN
select u.* from users u
where not exists (
    select 1 from banned_users b where b.user_id = u.id
);

-- Or
select u.* from users u
left join banned_users b on b.user_id = u.id
where b.user_id is null;
```

**❌ LIKE with Leading Wildcard**
```sql
-- Can't use B-tree index
select * from products where name like '%phone%';

-- ✅ Fix: Full-text search for real search
create index products_search_idx on products 
using gin(to_tsvector('english', name));

select * from products 
where to_tsvector('english', name) @@ to_tsquery('english', 'phone');

-- ✅ Or: Trigram index for partial matching
create extension if not exists pg_trgm;
create index products_name_trgm_idx on products using gin(name gin_trgm_ops);
```

### N+1 Query Prevention

```sql
-- ❌ N+1: Application loops with individual queries
-- for user in users: db.query("select * from orders where user_id = ?", user.id)

-- ✅ Single query with JOIN
select
    u.id as user_id,
    u.name,
    o.id as order_id,
    o.total,
    o.status
from users u
left join orders o on o.user_id = u.id
where u.id = any(array[1, 2, 3, 4, 5])
order by u.id, o.created_at desc;

-- ✅ Or use array aggregation
select
    u.id,
    u.name,
    coalesce(
        jsonb_agg(
            jsonb_build_object('id', o.id, 'total', o.total)
        ) filter (where o.id is not null),
        '[]'
    ) as orders
from users u
left join orders o on o.user_id = u.id
where u.id = any(array[1, 2, 3, 4, 5])
group by u.id, u.name;
```

### Pagination Patterns

**❌ OFFSET for Deep Pages**
```sql
-- Gets slower as offset increases (scans and discards rows)
select * from posts 
order by created_at desc 
limit 20 offset 100000;  -- Scans 100,020 rows!
```

**✅ Cursor-Based (Keyset) Pagination**
```sql
-- First page
select id, title, created_at 
from posts 
where status = 'published'
order by created_at desc, id desc 
limit 20;

-- Next page (use last row's values)
select id, title, created_at 
from posts 
where status = 'published'
    and (created_at, id) < ('2024-01-15 10:30:00+00', 12345)
order by created_at desc, id desc 
limit 20;
```

**Required Index:**
```sql
create index posts_published_cursor_idx 
on posts(created_at desc, id desc) 
where status = 'published';
```

**Trade-off:** Cursor pagination is faster but you can't jump to arbitrary pages. Use OFFSET only for small datasets or admin UIs.

### Efficient Counting

```sql
-- ❌ Exact count on large table (slow)
select count(*) from posts where status = 'published';

-- ✅ Estimate for UI (instant)
select reltuples::bigint as estimate
from pg_class
where relname = 'posts';

-- ✅ Exact up to limit (fast for "has more?" checks)
select count(*) from (
    select 1 from posts 
    where status = 'published' 
    limit 10001
) t;
-- Returns 10001 → show "10,000+"
-- Returns < 10001 → show exact count
```

---

## 3. Indexing Strategy

### Index Types and When to Use

| Type | Use Case | Example |
|------|----------|---------|
| **B-tree** (default) | Equality, range, sorting | `where email = ?`, `where date > ?` |
| **Hash** | Equality only (rare) | Large values with only `=` comparisons |
| **GIN** | Arrays, JSONB, full-text | `where tags @> array['a']`, JSONB queries |
| **GiST** | Geometric, range types, nearest-neighbor | PostGIS, range overlap |
| **BRIN** | Large tables with natural ordering | Time-series data, append-only logs |

### B-tree Index Patterns

```sql
-- Single column (most common)
create index users_email_idx on users(email);

-- Composite (multi-column)
-- CRITICAL: Column order matters!
create index orders_user_created_idx on orders(user_id, created_at desc);

-- This index supports:
-- ✅ where user_id = 1
-- ✅ where user_id = 1 and created_at > '2024-01-01'
-- ✅ where user_id = 1 order by created_at desc
-- ❌ where created_at > '2024-01-01' (can't skip first column)

-- Rule: Put equality columns first, range/sort columns last
```

### Partial Indexes

```sql
-- Index only rows that matter
create index orders_pending_idx on orders(created_at)
where status = 'pending';

-- Much smaller than full index
-- Perfect for queries that always filter by status

-- Common patterns:
create index users_active_idx on users(email)
where deleted_at is null;

create index posts_published_idx on posts(published_at desc)
where status = 'published';

create index orders_recent_idx on orders(user_id, created_at)
where created_at > '2024-01-01';  -- Careful: date is fixed!
```

### Covering Indexes (INCLUDE)

```sql
-- Include columns to avoid table lookup (heap fetch)
create index users_email_idx on users(email) 
include (id, name, avatar_url);

-- This query can be Index Only Scan:
select id, name, avatar_url 
from users 
where email = 'test@example.com';

-- Trade-off: Larger index, but faster for specific queries
-- Use when: Query is frequent and always needs same columns
```

### GIN Indexes for JSONB

```sql
-- Index entire JSONB document
create index products_data_idx on products using gin(data);

-- Supports:
-- data @> '{"color": "red"}'  (contains)
-- data ? 'color'              (key exists)
-- data ?| array['a', 'b']     (any key exists)

-- Index specific path (smaller, faster for that path)
create index products_color_idx on products using gin((data->'color'));

-- For text search within JSONB
create index products_search_idx on products 
using gin(to_tsvector('english', data->>'description'));
```

### BRIN Indexes

```sql
-- For large, naturally ordered tables (time-series, logs)
create index events_created_at_idx on events using brin(created_at);

-- Very small (stores min/max per block range)
-- Good when: Data is inserted in order, table is large
-- Bad when: Data is randomly ordered, need exact lookups
```

### Index Maintenance

```sql
-- Find unused indexes
select
    schemaname || '.' || relname as table,
    indexrelname as index,
    pg_size_pretty(pg_relation_size(i.indexrelid)) as size,
    idx_scan as scans
from pg_stat_user_indexes i
join pg_index using (indexrelid)
where idx_scan = 0
    and indisunique is false  -- Keep unique constraints
order by pg_relation_size(i.indexrelid) desc;

-- Index size vs table size
select
    relname as table,
    pg_size_pretty(pg_relation_size(relid)) as table_size,
    pg_size_pretty(pg_indexes_size(relid)) as indexes_size
from pg_stat_user_tables
order by pg_relation_size(relid) desc;

-- Rebuild bloated index
reindex index concurrently users_email_idx;
```

**Critical:** Don't over-index! Each index:
- Slows down writes (INSERT, UPDATE, DELETE)
- Uses storage
- Needs maintenance (vacuum, reindex)

---

## 4. Safe Migrations

### Risk Assessment

| Operation | Lock | Duration | Risk |
|-----------|------|----------|------|
| Add column (nullable) | Brief | Instant | Low |
| Add column (with default, PG11+) | Brief | Instant | Low |
| Drop column | Brief | Instant | Low* |
| Add NOT NULL (existing column) | ACCESS EXCLUSIVE | Scans table | High |
| Create index | SHARE | Minutes-hours | Medium |
| Create index CONCURRENTLY | None** | Longer | Low |
| Change column type | ACCESS EXCLUSIVE | Rewrites table | Very High |
| Add foreign key | SHARE ROW EXCLUSIVE | Scans table | High |

*Application must not use column
**Allows reads and writes, but takes longer

### Safe: Adding Columns

```sql
-- Nullable column: Always safe
alter table users add column phone text;

-- With default (PostgreSQL 11+): Safe, doesn't rewrite table
alter table users add column is_verified boolean not null default false;

-- NOT NULL without default: Only if table is empty
alter table users add column required_field text not null;  -- Fails if rows exist!
```

### Safe: Creating Indexes

```sql
-- ❌ Blocks writes until complete
create index users_email_idx on users(email);

-- ✅ Allows concurrent reads and writes
create index concurrently users_email_idx on users(email);

-- Note: CONCURRENTLY takes longer and can't run in transaction
-- If it fails, you get an INVALID index that must be dropped
```

### Adding NOT NULL to Existing Column

```sql
-- ❌ Dangerous: Locks table, scans all rows
alter table users alter column email set not null;

-- ✅ Safe: Three-step process

-- Step 1: Add constraint as NOT VALID (instant, no scan)
alter table users 
add constraint users_email_not_null 
check (email is not null) not valid;

-- Step 2: Validate constraint (scans, but doesn't block writes)
alter table users 
validate constraint users_email_not_null;

-- Step 3: Convert to real NOT NULL (instant, constraint already validated)
alter table users alter column email set not null;
alter table users drop constraint users_email_not_null;
```

### Adding Foreign Key

```sql
-- ❌ Dangerous: Locks both tables, scans referencing table
alter table orders 
add constraint orders_user_id_fkey 
foreign key (user_id) references users(id);

-- ✅ Safe: Two-step process

-- Step 1: Add NOT VALID (instant)
alter table orders 
add constraint orders_user_id_fkey 
foreign key (user_id) references users(id) not valid;

-- Step 2: Validate (scans, but minimal locking)
alter table orders validate constraint orders_user_id_fkey;
```

### Zero-Downtime Column Rename

```sql
-- DON'T: alter table users rename column name to full_name;
-- Instantly breaks application!

-- DO: Expand-Contract pattern

-- Phase 1: Expand (add new column)
alter table users add column full_name text;

-- Phase 2: Backfill (in batches)
-- See backfill section below

-- Phase 3: Deploy app writing to BOTH columns
-- Deploy code that writes to both name and full_name

-- Phase 4: Deploy app reading from new column only
-- Deploy code that reads from full_name

-- Phase 5: Contract (remove old column)
alter table users drop column name;
```

### Backfilling Large Tables

```sql
-- ❌ Don't: Single massive update
update users set new_col = old_col;  -- Locks table, huge transaction

-- ✅ Do: Batch updates with rate limiting

-- Option 1: Simple batching
do $$
declare
    batch_size constant int := 5000;
    total_updated int := 0;
    batch_updated int;
begin
    loop
        with batch as (
            select id 
            from users 
            where new_col is null 
            limit batch_size
            for update skip locked
        )
        update users 
        set new_col = old_col
        where id in (select id from batch);
        
        get diagnostics batch_updated = row_count;
        total_updated := total_updated + batch_updated;
        
        exit when batch_updated = 0;
        
        raise notice 'Updated % rows (total: %)', batch_updated, total_updated;
        commit;
        perform pg_sleep(0.1);  -- Rate limit
    end loop;
end $$;

-- Option 2: Range-based batching (faster for sequential IDs)
do $$
declare
    batch_size constant int := 10000;
    min_id bigint;
    max_id bigint;
    current_id bigint;
begin
    select min(id), max(id) into min_id, max_id from users;
    current_id := min_id;
    
    while current_id <= max_id loop
        update users 
        set new_col = old_col
        where id >= current_id 
            and id < current_id + batch_size
            and new_col is null;
            
        commit;
        current_id := current_id + batch_size;
        perform pg_sleep(0.05);
    end loop;
end $$;
```

---

## 5. Production Operations

### Connection Management

```sql
-- Current connections by state
select state, count(*) 
from pg_stat_activity 
group by state;

-- Long-running queries
select 
    pid,
    now() - query_start as duration,
    state,
    query
from pg_stat_activity
where state != 'idle'
    and query_start < now() - interval '5 minutes'
order by duration desc;

-- Kill a specific connection
select pg_terminate_backend(12345);

-- Kill idle connections older than 10 minutes
select pg_terminate_backend(pid)
from pg_stat_activity
where state = 'idle'
    and query_start < now() - interval '10 minutes'
    and pid != pg_backend_pid();
```

**Connection Pooling:** Use PgBouncer or similar. PostgreSQL handles ~100 connections well, struggles at 500+.

### Lock Monitoring

```sql
-- Check for blocking locks
select
    blocked.pid as blocked_pid,
    blocked.query as blocked_query,
    blocking.pid as blocking_pid,
    blocking.query as blocking_query,
    now() - blocked.query_start as blocked_duration
from pg_stat_activity blocked
join pg_locks blocked_locks on blocked.pid = blocked_locks.pid
join pg_locks blocking_locks 
    on blocked_locks.relation = blocking_locks.relation
    and blocked_locks.pid != blocking_locks.pid
join pg_stat_activity blocking on blocking_locks.pid = blocking.pid
where not blocked_locks.granted;

-- Statement timeout (prevent runaway queries)
set statement_timeout = '30s';

-- Lock timeout (prevent long lock waits)
set lock_timeout = '10s';
```

### Vacuum and Maintenance

```sql
-- Tables needing vacuum
select
    schemaname || '.' || relname as table,
    n_dead_tup as dead_tuples,
    n_live_tup as live_tuples,
    round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 2) as dead_pct,
    last_autovacuum,
    last_autoanalyze
from pg_stat_user_tables
where n_dead_tup > 10000
order by n_dead_tup desc;

-- Table bloat estimate
select
    schemaname || '.' || relname as table,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size,
    pg_size_pretty(pg_relation_size(relid)) as table_size,
    pg_size_pretty(pg_indexes_size(relid)) as indexes_size
from pg_stat_user_tables
order by pg_total_relation_size(relid) desc
limit 20;

-- Manual vacuum (usually autovacuum handles this)
vacuum (verbose, analyze) users;
```

### Useful Diagnostic Queries

```sql
-- Slow queries (requires pg_stat_statements extension)
select
    substring(query, 1, 100) as query_preview,
    calls,
    round(total_exec_time::numeric / 1000, 2) as total_seconds,
    round(mean_exec_time::numeric, 2) as avg_ms,
    rows
from pg_stat_statements
order by total_exec_time desc
limit 20;

-- Cache hit ratio (should be > 99%)
select
    sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0) as table_hit_ratio,
    sum(idx_blks_hit) / nullif(sum(idx_blks_hit) + sum(idx_blks_read), 0) as index_hit_ratio
from pg_statio_user_tables;

-- Index usage ratio
select
    relname as table,
    seq_scan,
    idx_scan,
    round(100.0 * idx_scan / nullif(seq_scan + idx_scan, 0), 2) as idx_usage_pct
from pg_stat_user_tables
where seq_scan + idx_scan > 100
order by seq_scan desc;
```

---

## 6. Critical Rules

### Always Do

1. **Index all foreign keys** - Without exception
2. **Use TIMESTAMPTZ** - Never TIMESTAMP without timezone
3. **Use TEXT over VARCHAR** - Same performance, more flexible
4. **Use BIGINT for IDs** - INT runs out sooner than you think
5. **Test migrations on production-size data** - Not just dev database
6. **Use CONCURRENTLY for production indexes** - Always

### Never Do

1. **Never use OFFSET for deep pagination** - Use cursor pagination
2. **Never add NOT NULL without checking existing data** - Migration will fail
3. **Never change column type on large tables without a plan** - Rewrites entire table
4. **Never rely on default statement_timeout in production** - Set explicitly
5. **Never assume ORM-generated queries are efficient** - Check EXPLAIN regularly
6. **Never skip foreign key indexes** - Even if "we don't query that direction"

### When in Doubt

1. **Measure before optimizing** - Use EXPLAIN ANALYZE
2. **Start simple, optimize when needed** - Premature optimization is real
3. **Prefer correctness over performance** - Constraints and transactions exist for a reason
4. **Document non-obvious decisions** - Your future self will thank you

---

## Related Skills

- For data modeling: `data-modeling`
- For FastAPI/SQLModel: `fastapi`
- For API design: `api-design`
