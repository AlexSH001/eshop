# Database Migration Plan: SQLite to PostgreSQL

## Overview
Migrate from SQLite to PostgreSQL for production scalability and concurrent user support.

## Current Issues
- SQLite not suitable for concurrent users
- No connection pooling
- Limited scalability
- No automated backups
- Single point of failure

## Migration Strategy

### Phase 1: Preparation and Setup

#### Step 1: Install PostgreSQL Dependencies
```bash
# Add PostgreSQL dependencies
npm install pg pg-pool dotenv
npm install --save-dev @types/pg
```

#### Step 2: Create PostgreSQL Configuration
Create: `backend/src/config/database.js`
```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
});

// Test the connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
```

#### Step 3: Create Migration Scripts
Create: `backend/src/database/migrations/001_initial_schema.sql`
```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar VARCHAR(500),
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  avatar VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  image VARCHAR(500),
  parent_id INTEGER REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  short_description TEXT,
  sku VARCHAR(100) UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  cost_price DECIMAL(10,2),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 5,
  weight DECIMAL(8,2),
  dimensions JSONB,
  images JSONB,
  featured_image VARCHAR(500),
  tags JSONB,
  attributes JSONB,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
  is_featured BOOLEAN DEFAULT FALSE,
  meta_title VARCHAR(255),
  meta_description TEXT,
  sales_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  specifications JSONB,
  shipping JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User addresses table
CREATE TABLE IF NOT EXISTS user_addresses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) DEFAULT 'shipping' CHECK (type IN ('shipping', 'billing')),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  company VARCHAR(100),
  address_line_1 VARCHAR(255) NOT NULL,
  address_line_2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(2) NOT NULL DEFAULT 'US',
  phone VARCHAR(20),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shopping cart table
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id),
  UNIQUE(session_id, product_id)
);

-- Wishlist table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method VARCHAR(50),
  payment_id VARCHAR(255),

  -- Billing address
  billing_first_name VARCHAR(100) NOT NULL,
  billing_last_name VARCHAR(100) NOT NULL,
  billing_company VARCHAR(100),
  billing_address_line_1 VARCHAR(255) NOT NULL,
  billing_address_line_2 VARCHAR(255),
  billing_city VARCHAR(100) NOT NULL,
  billing_state VARCHAR(100) NOT NULL,
  billing_postal_code VARCHAR(20) NOT NULL,
  billing_country VARCHAR(2) NOT NULL,

  -- Shipping address
  shipping_first_name VARCHAR(100) NOT NULL,
  shipping_last_name VARCHAR(100) NOT NULL,
  shipping_company VARCHAR(100),
  shipping_address_line_1 VARCHAR(255) NOT NULL,
  shipping_address_line_2 VARCHAR(255),
  shipping_city VARCHAR(100) NOT NULL,
  shipping_state VARCHAR(100) NOT NULL,
  shipping_postal_code VARCHAR(20) NOT NULL,
  shipping_country VARCHAR(2) NOT NULL,

  -- Pricing
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,

  -- Metadata
  notes TEXT,
  tracking_number VARCHAR(100),
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  product_image VARCHAR(500),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(255),
  comment TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT TRUE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, user_id, order_id)
);

-- Search history table
CREATE TABLE IF NOT EXISTS search_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  search_term VARCHAR(255) NOT NULL,
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(20) DEFAULT 'verification' CHECK (type IN ('verification', 'reset')),
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_session ON cart_items(session_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_search_term ON search_history(search_term);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(product_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_addresses_updated_at BEFORE UPDATE ON user_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Step 4: Create Database Migration Script
Create: `backend/src/database/migratePostgres.js`
```javascript
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigrations() {
  try {
    console.log('🚀 Starting PostgreSQL migration...');
    
    // Read and execute migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of migrationFiles) {
      console.log(`📝 Executing migration: ${file}`);
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      await pool.query(migrationSQL);
      console.log(`✅ Migration ${file} completed`);
    }
    
    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations().catch(process.exit);
}

module.exports = { runMigrations };
```

### Phase 2: Data Migration

#### Step 5: Create Data Migration Script
Create: `backend/src/database/migrateData.js`
```javascript
const sqlite3 = require('sqlite3').verbose();
const pool = require('../config/database');
const path = require('path');

async function migrateData() {
  const sqliteDb = new sqlite3.Database(path.join(__dirname, '../../data/store.db'));
  
  try {
    console.log('🔄 Starting data migration from SQLite to PostgreSQL...');
    
    // Migrate users
    console.log('📦 Migrating users...');
    const users = await querySqlite(sqliteDb, 'SELECT * FROM users');
    for (const user of users) {
      await pool.query(`
        INSERT INTO users (id, email, password, first_name, last_name, phone, avatar, email_verified, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [user.id, user.email, user.password, user.first_name, user.last_name, user.phone, user.avatar, user.email_verified, user.is_active, user.created_at, user.updated_at]);
    }
    
    // Migrate categories
    console.log('📦 Migrating categories...');
    const categories = await querySqlite(sqliteDb, 'SELECT * FROM categories');
    for (const category of categories) {
      await pool.query(`
        INSERT INTO categories (id, name, slug, description, icon, image, parent_id, sort_order, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [category.id, category.name, category.slug, category.description, category.icon, category.image, category.parent_id, category.sort_order, category.is_active, category.created_at, category.updated_at]);
    }
    
    // Migrate products
    console.log('📦 Migrating products...');
    const products = await querySqlite(sqliteDb, 'SELECT * FROM products');
    for (const product of products) {
      await pool.query(`
        INSERT INTO products (id, name, slug, description, short_description, sku, price, original_price, cost_price, category_id, stock, min_stock, weight, dimensions, images, featured_image, tags, attributes, status, is_featured, meta_title, meta_description, sales_count, view_count, rating, review_count, specifications, shipping, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
        ON CONFLICT (id) DO NOTHING
      `, [product.id, product.name, product.slug, product.description, product.short_description, product.sku, product.price, product.original_price, product.cost_price, product.category_id, product.stock, product.min_stock, product.weight, product.dimensions, product.images, product.featured_image, product.tags, product.attributes, product.status, product.is_featured, product.meta_title, product.meta_description, product.sales_count, product.view_count, product.rating, product.review_count, product.specifications, product.shipping, product.created_at, product.updated_at]);
    }
    
    // Continue with other tables...
    console.log('✅ Data migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Data migration failed:', error);
    throw error;
  } finally {
    sqliteDb.close();
    await pool.end();
  }
}

function querySqlite(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = { migrateData };
```

### Phase 3: Update Application Code

#### Step 6: Update Database Interface
Create: `backend/src/database/postgres.js`
```javascript
const pool = require('../config/database');

class PostgresDatabase {
  async query(sql, params = []) {
    try {
      const result = await pool.query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async execute(sql, params = []) {
    try {
      const result = await pool.query(sql, params);
      return {
        id: result.rows[0]?.id,
        changes: result.rowCount
      };
    } catch (error) {
      console.error('Database execute error:', error);
      throw error;
    }
  }

  async get(sql, params = []) {
    try {
      const result = await pool.query(sql, params);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Database get error:', error);
      throw error;
    }
  }

  async beginTransaction() {
    const client = await pool.connect();
    await client.query('BEGIN');
    return client;
  }

  async commit(client) {
    await client.query('COMMIT');
    client.release();
  }

  async rollback(client) {
    await client.query('ROLLBACK');
    client.release();
  }

  close() {
    return pool.end();
  }
}

module.exports = new PostgresDatabase();
```

#### Step 7: Update Environment Configuration
Add to `backend/.env.production`:
```env
# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eshop_production
DB_USER=eshop_user
DB_PASSWORD=<strong-password>
DB_SSL=true

# Connection Pool Settings
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=2000
```

### Phase 4: Backup Strategy

#### Step 8: Create Backup Script
Create: `backend/scripts/backup.js`
```javascript
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const backupDatabase = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backups');
  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const command = `PGPASSWORD=${process.env.DB_PASSWORD} pg_dump -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -f ${backupFile}`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Backup failed:', error);
      return;
    }
    console.log('✅ Database backup completed:', backupFile);
    
    // Clean up old backups (keep last 7 days)
    cleanupOldBackups(backupDir);
  });
};

const cleanupOldBackups = (backupDir) => {
  const files = fs.readdirSync(backupDir);
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  
  files.forEach(file => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    
    if (now - stats.mtime.getTime() > sevenDays) {
      fs.unlinkSync(filePath);
      console.log('🗑️ Cleaned up old backup:', file);
    }
  });
};

// Run backup if called directly
if (require.main === module) {
  backupDatabase();
}

module.exports = { backupDatabase };
```

## Testing Plan
1. Test schema creation
2. Test data migration
3. Test connection pooling
4. Test backup/restore functionality
5. Performance testing with concurrent users
6. Test rollback procedures

## Rollback Plan
1. Keep SQLite database as backup
2. Maintain dual database support during transition
3. Monitor for data inconsistencies
4. Have quick rollback script ready

## Timeline
- **Week 1**: Setup PostgreSQL and create migration scripts
- **Week 2**: Test migrations in staging environment
- **Week 3**: Execute production migration
- **Week 4**: Monitor and optimize performance

## Success Criteria
- [ ] All data successfully migrated
- [ ] No data loss or corruption
- [ ] Performance improved with concurrent users
- [ ] Automated backups working
- [ ] Connection pooling functional
- [ ] All application features working
- [ ] Monitoring and alerting in place 