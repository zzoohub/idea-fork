-- Product name trigram index for ILIKE search performance
CREATE INDEX idx_product_name_trgm ON product USING GIN (name gin_trgm_ops);
