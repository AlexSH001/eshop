-- Migration: Add specifications column to cart_items table
-- This allows cart items to store selected product specifications
-- so that different specification combinations are treated as separate items

-- Step 1: Add specifications column
-- For SQLite
ALTER TABLE cart_items ADD COLUMN specifications TEXT;

-- For PostgreSQL (run separately if using PostgreSQL)
-- ALTER TABLE cart_items ADD COLUMN specifications JSONB;

-- Step 2: Remove UNIQUE constraints to allow same product with different specifications
-- For SQLite
-- Note: SQLite doesn't support DROP CONSTRAINT directly, so you may need to recreate the table
-- or use a workaround. For existing databases, the application will handle duplicate checking.

-- For PostgreSQL
-- ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;
-- ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_session_id_product_id_key;

