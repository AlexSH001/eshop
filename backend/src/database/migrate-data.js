const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const pool = require('../config/database');

const SQLITE_DB_PATH = path.join(__dirname, '../../database.sqlite');

async function migrateDataFromSQLite() {
  console.log('🔄 Starting data migration from SQLite to PostgreSQL...');
  
  // Connect to SQLite
  const sqliteDb = new sqlite3.Database(SQLITE_DB_PATH);
  
  try {
    // Check if SQLite database exists and has data
    const tableCount = await new Promise((resolve, reject) => {
      sqliteDb.get("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'", (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
    
    if (tableCount === 0) {
      console.log('ℹ️  SQLite database is empty, skipping data migration');
      return;
    }
    
    console.log(`📊 Found ${tableCount} tables in SQLite database`);
    
    // Get PostgreSQL client
    const pgClient = await pool.connect();
    
    try {
      // Migrate users
      console.log('👥 Migrating users...');
      const users = await new Promise((resolve, reject) => {
        sqliteDb.all("SELECT * FROM users", (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      for (const user of users) {
        await pgClient.query(`
          INSERT INTO users (id, email, password, first_name, last_name, phone, avatar, email_verified, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO NOTHING
        `, [
          user.id, user.email, user.password, user.first_name, user.last_name,
          user.phone, user.avatar, user.email_verified, user.is_active,
          user.created_at, user.updated_at
        ]);
      }
      console.log(`✅ Migrated ${users.length} users`);
      
      // Migrate admins
      console.log('👨‍💼 Migrating admins...');
      const admins = await new Promise((resolve, reject) => {
        sqliteDb.all("SELECT * FROM admins", (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      for (const admin of admins) {
        await pgClient.query(`
          INSERT INTO admins (id, email, password, name, role, avatar, is_active, last_login, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [
          admin.id, admin.email, admin.password, admin.name, admin.role,
          admin.avatar, admin.is_active, admin.last_login, admin.created_at, admin.updated_at
        ]);
      }
      console.log(`✅ Migrated ${admins.length} admins`);
      
      // Migrate categories
      console.log('📂 Migrating categories...');
      const categories = await new Promise((resolve, reject) => {
        sqliteDb.all("SELECT * FROM categories", (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      for (const category of categories) {
        await pgClient.query(`
          INSERT INTO categories (id, name, slug, description, icon, image, href, parent_id, sort_order, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO NOTHING
        `, [
          category.id, category.name, category.slug, category.description,
          category.icon, category.image, category.href, category.parent_id, category.sort_order,
          category.is_active, category.created_at, category.updated_at
        ]);
      }
      console.log(`✅ Migrated ${categories.length} categories`);
      
      // Migrate products
      console.log('📦 Migrating products...');
      const products = await new Promise((resolve, reject) => {
        sqliteDb.all("SELECT * FROM products", (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      for (const product of products) {
        // Convert JSON strings to JSONB
        const dimensions = product.dimensions ? JSON.parse(product.dimensions) : null;
        const images = product.images ? JSON.parse(product.images) : null;
        const tags = product.tags ? JSON.parse(product.tags) : null;
        const attributes = product.attributes ? JSON.parse(product.attributes) : null;
        const specifications = product.specifications ? JSON.parse(product.specifications) : null;
        
        await pgClient.query(`
          INSERT INTO products (id, name, slug, description, short_description, sku, price, original_price, cost_price, 
                               category_id, stock, min_stock, weight, dimensions, images, featured_image, tags, attributes,
                               status, is_featured, meta_title, meta_description, sales_count, view_count, rating, review_count,
                               specifications, shipping, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
          ON CONFLICT (id) DO NOTHING
        `, [
          product.id, product.name, product.slug, product.description, product.short_description,
          product.sku, product.price, product.original_price, product.cost_price, product.category_id,
          product.stock, product.min_stock, product.weight, dimensions, images, product.featured_image,
          tags, attributes, product.status, product.is_featured, product.meta_title, product.meta_description,
          product.sales_count, product.view_count, product.rating, product.review_count, specifications,
          product.shipping, product.created_at, product.updated_at
        ]);
      }
      console.log(`✅ Migrated ${products.length} products`);
      
      // Migrate user addresses
      console.log('📍 Migrating user addresses...');
      const addresses = await new Promise((resolve, reject) => {
        sqliteDb.all("SELECT * FROM user_addresses", (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      for (const address of addresses) {
        await pgClient.query(`
          INSERT INTO user_addresses (id, user_id, type, first_name, last_name, company, address_line_1, address_line_2,
                                     city, state, postal_code, country, phone, is_default, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (id) DO NOTHING
        `, [
          address.id, address.user_id, address.type, address.first_name, address.last_name,
          address.company, address.address_line_1, address.address_line_2, address.city,
          address.state, address.postal_code, address.country, address.phone, address.is_default,
          address.created_at, address.updated_at
        ]);
      }
      console.log(`✅ Migrated ${addresses.length} user addresses`);
      
      // Migrate cart items
      console.log('🛒 Migrating cart items...');
      const cartItems = await new Promise((resolve, reject) => {
        sqliteDb.all("SELECT * FROM cart_items", (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      for (const item of cartItems) {
        await pgClient.query(`
          INSERT INTO cart_items (id, user_id, session_id, product_id, quantity, price, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
        `, [
          item.id, item.user_id, item.session_id, item.product_id, item.quantity,
          item.price, item.created_at, item.updated_at
        ]);
      }
      console.log(`✅ Migrated ${cartItems.length} cart items`);
      
      // Migrate wishlist items
      console.log('❤️  Migrating wishlist items...');
      const wishlistItems = await new Promise((resolve, reject) => {
        sqliteDb.all("SELECT * FROM wishlist_items", (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      for (const item of wishlistItems) {
        await pgClient.query(`
          INSERT INTO wishlist_items (id, user_id, product_id, created_at)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO NOTHING
        `, [item.id, item.user_id, item.product_id, item.created_at]);
      }
      console.log(`✅ Migrated ${wishlistItems.length} wishlist items`);
      
      // Migrate orders
      console.log('📋 Migrating orders...');
      const orders = await new Promise((resolve, reject) => {
        sqliteDb.all("SELECT * FROM orders", (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      for (const order of orders) {
        await pgClient.query(`
          INSERT INTO orders (id, order_number, user_id, email, phone, status, payment_status, payment_method, payment_id,
                             billing_first_name, billing_last_name, billing_company, billing_address_line_1, billing_address_line_2,
                             billing_city, billing_state, billing_postal_code, billing_country,
                             shipping_first_name, shipping_last_name, shipping_company, shipping_address_line_1, shipping_address_line_2,
                             shipping_city, shipping_state, shipping_postal_code, shipping_country,
                             subtotal, tax_amount, shipping_amount, discount_amount, total,
                             notes, tracking_number, shipped_at, delivered_at, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36)
          ON CONFLICT (id) DO NOTHING
        `, [
          order.id, order.order_number, order.user_id, order.email, order.phone, order.status,
          order.payment_status, order.payment_method, order.payment_id, order.billing_first_name,
          order.billing_last_name, order.billing_company, order.billing_address_line_1, order.billing_address_line_2,
          order.billing_city, order.billing_state, order.billing_postal_code, order.billing_country,
          order.shipping_first_name, order.shipping_last_name, order.shipping_company, order.shipping_address_line_1,
          order.shipping_address_line_2, order.shipping_city, order.shipping_state, order.shipping_postal_code,
          order.shipping_country, order.subtotal, order.tax_amount, order.shipping_amount, order.discount_amount,
          order.total, order.notes, order.tracking_number, order.shipped_at, order.delivered_at,
          order.created_at, order.updated_at
        ]);
      }
      console.log(`✅ Migrated ${orders.length} orders`);
      
      // Migrate order items
      console.log('📦 Migrating order items...');
      const orderItems = await new Promise((resolve, reject) => {
        sqliteDb.all("SELECT * FROM order_items", (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      for (const item of orderItems) {
        await pgClient.query(`
          INSERT INTO order_items (id, order_id, product_id, product_name, product_sku, product_image, quantity, price, total, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [
          item.id, item.order_id, item.product_id, item.product_name, item.product_sku,
          item.product_image, item.quantity, item.price, item.total, item.created_at
        ]);
      }
      console.log(`✅ Migrated ${orderItems.length} order items`);
      
      // Migrate product reviews
      console.log('⭐ Migrating product reviews...');
      const reviews = await new Promise((resolve, reject) => {
        sqliteDb.all("SELECT * FROM product_reviews", (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      for (const review of reviews) {
        await pgClient.query(`
          INSERT INTO product_reviews (id, product_id, user_id, order_id, rating, title, comment, is_verified, is_approved, helpful_count, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO NOTHING
        `, [
          review.id, review.product_id, review.user_id, review.order_id, review.rating,
          review.title, review.comment, review.is_verified, review.is_approved, review.helpful_count,
          review.created_at, review.updated_at
        ]);
      }
      console.log(`✅ Migrated ${reviews.length} product reviews`);
      
      // Migrate search history
      console.log('🔍 Migrating search history...');
      const searchHistory = await new Promise((resolve, reject) => {
        sqliteDb.all("SELECT * FROM search_history", (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      for (const search of searchHistory) {
        await pgClient.query(`
          INSERT INTO search_history (id, user_id, session_id, search_term, results_count, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING
        `, [
          search.id, search.user_id, search.session_id, search.search_term,
          search.results_count, search.created_at
        ]);
      }
      console.log(`✅ Migrated ${searchHistory.length} search history records`);
      
      // Migrate email tokens
      console.log('📧 Migrating email tokens...');
      const emailTokens = await new Promise((resolve, reject) => {
        sqliteDb.all("SELECT * FROM email_tokens", (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      for (const token of emailTokens) {
        await pgClient.query(`
          INSERT INTO email_tokens (id, user_id, token, type, expires_at, used_at, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING
        `, [
          token.id, token.user_id, token.token, token.type, token.expires_at,
          token.used_at, token.created_at
        ]);
      }
      console.log(`✅ Migrated ${emailTokens.length} email tokens`);
      
      console.log('🎉 Data migration completed successfully!');
      
    } finally {
      pgClient.release();
    }
    
  } catch (error) {
    console.error('❌ Data migration failed:', error);
    throw error;
  } finally {
    sqliteDb.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateDataFromSQLite()
    .then(() => {
      console.log('🎉 Data migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Data migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateDataFromSQLite }; 