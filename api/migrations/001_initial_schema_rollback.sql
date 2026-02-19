-- idea-fork: Rollback for 001_initial_schema.sql
-- Drops all tables, types, and functions in reverse dependency order

-- Triggers (dropped automatically with tables, but explicit for clarity)
DROP TRIGGER IF EXISTS trg_tracked_keyword_updated_at ON tracked_keyword;
DROP TRIGGER IF EXISTS trg_user_account_updated_at ON user_account;
DROP TRIGGER IF EXISTS trg_product_updated_at ON product;
DROP TRIGGER IF EXISTS trg_brief_updated_at ON brief;
DROP TRIGGER IF EXISTS trg_need_cluster_updated_at ON need_cluster;
DROP TRIGGER IF EXISTS trg_post_updated_at ON post;
DROP TRIGGER IF EXISTS trg_pipeline_cycle_updated_at ON pipeline_cycle;

DROP FUNCTION IF EXISTS set_updated_at();

-- Tables (reverse dependency order)
DROP TABLE IF EXISTS trending_keyword;
DROP TABLE IF EXISTS notification;
DROP TABLE IF EXISTS tracked_keyword;
DROP TABLE IF EXISTS bookmark;
DROP TABLE IF EXISTS user_account;
DROP TABLE IF EXISTS product_post;
DROP TABLE IF EXISTS product;
DROP TABLE IF EXISTS brief_source;
DROP TABLE IF EXISTS brief;
DROP TABLE IF EXISTS cluster_post;
DROP TABLE IF EXISTS need_cluster;
DROP TABLE IF EXISTS post;
DROP TABLE IF EXISTS pipeline_cycle;

-- Enum types
DROP TYPE IF EXISTS keyword_type;
DROP TYPE IF EXISTS pipeline_status;
DROP TYPE IF EXISTS user_tier;
DROP TYPE IF EXISTS post_tag;
DROP TYPE IF EXISTS post_source;

-- Extensions (keep pgvector — may be used by other schemas)
-- DROP EXTENSION IF EXISTS vector;
