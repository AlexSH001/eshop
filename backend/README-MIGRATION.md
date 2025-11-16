# Database Migration Guide

## Adding Specifications Column to Cart Items

This migration adds the `specifications` column to the `cart_items` table and removes UNIQUE constraints to allow the same product with different specifications.

### Running the Migration

#### Option 1: Using Docker Compose (Recommended)

If you're using docker-compose, run the migration inside the backend container:

```bash
docker-compose exec backend node src/database/migrations/add-cart-specifications.js
```

This will use the database connection from the docker-compose environment.

#### Option 2: Standalone Docker Container

If running a standalone container, you need to pass the database connection environment variables:

```bash
docker run --rm \
  --network your_network_name \
  -e DB_CLIENT=postgres \
  -e DB_HOST=your_postgres_host \
  -e DB_PORT=5432 \
  -e DB_NAME=eshop \
  -e DB_USER=postgres \
  -e DB_PASSWORD=your_password \
  eshop-backend:0.0.1 \
  node src/database/migrations/add-cart-specifications.js
```

#### Option 3: Direct Database Connection

You can also connect directly to the database and run the SQL:

**For PostgreSQL:**
```sql
-- Add specifications column
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS specifications JSONB;

-- Remove UNIQUE constraints
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_session_id_product_id_key;
```

**For SQLite:**
```sql
-- Add specifications column
ALTER TABLE cart_items ADD COLUMN specifications TEXT;
```

Note: SQLite doesn't support DROP CONSTRAINT directly. The application code will handle duplicate checking based on specifications.

### What the Migration Does

1. **Adds `specifications` column**: Stores selected product specifications as JSON
2. **Removes UNIQUE constraints**: Allows the same product with different specifications to be added to cart
3. **Preserves existing data**: All existing cart items will have `specifications = NULL`

### Verification

After running the migration, you can verify it worked by:

1. Checking the column exists:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'cart_items' AND column_name = 'specifications';
   ```

2. Checking constraints are removed:
   ```sql
   SELECT constraint_name 
   FROM information_schema.table_constraints 
   WHERE table_name = 'cart_items' AND constraint_type = 'UNIQUE';
   ```

3. Testing: Try adding the same product with different specifications to the cart - it should work without errors.

