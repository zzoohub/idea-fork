-- 001_initial_schema.rollback.sql
-- Rolls back the entire initial schema

DROP TRIGGER IF EXISTS trg_post_search_vector ON post;
DROP FUNCTION IF EXISTS fn_post_search_vector();

DROP TRIGGER IF EXISTS trg_product_updated_at ON product;
DROP TRIGGER IF EXISTS trg_brief_updated_at ON brief;
DROP TRIGGER IF EXISTS trg_cluster_updated_at ON cluster;
DROP TRIGGER IF EXISTS trg_post_updated_at ON post;

DROP TABLE IF EXISTS rating;
DROP TABLE IF EXISTS product_post;
DROP TABLE IF EXISTS product;
DROP TABLE IF EXISTS brief_source;
DROP TABLE IF EXISTS brief;
DROP TABLE IF EXISTS cluster_post;
DROP TABLE IF EXISTS cluster;
DROP TABLE IF EXISTS post_tag;
DROP TABLE IF EXISTS tag;
DROP TABLE IF EXISTS post;

DROP FUNCTION IF EXISTS fn_set_updated_at();

DROP EXTENSION IF EXISTS pg_trgm;
