const fs = require('fs');
const path = require('path');
const { hashPassword } = require('../utils/auth');

// Database detection and initialization
let database;
let isPostgres = false;

async function initializeDatabase() {
  // Check if PostgreSQL is configured
  const dbClient = process.env.DB_CLIENT || 'sqlite';
  
  if (dbClient === 'postgres' || process.env.DB_HOST) {
    try {
      const { postgresDatabase } = require('./init-postgres');
      database = postgresDatabase;
      isPostgres = true;
      console.log('🔄 Using PostgreSQL database');
    } catch (error) {
      console.log('⚠️ PostgreSQL not available, falling back to SQLite');
      const { database: sqliteDatabase } = require('./init');
      database = sqliteDatabase;
      isPostgres = false;
    }
  } else {
    const { database: sqliteDatabase } = require('./init');
    database = sqliteDatabase;
    isPostgres = false;
    console.log('🔄 Using SQLite database');
  }

  await database.connect();
  await database.initializeSchema();
}

async function seedUniversalDatabase() {
  try {
    console.log('🌱 Starting universal database seeding from JSON files...');

    // Initialize database (automatically detects SQLite or PostgreSQL)
    await initializeDatabase();

    // Begin transaction
    if (isPostgres) {
      const client = await database.beginTransaction();
      try {
        await seedData(client);
        await database.commit(client);
      } catch (error) {
        await database.rollback(client);
        throw error;
      }
    } else {
      await database.beginTransaction();
      try {
        await seedData();
        await database.commit();
      } catch (error) {
        await database.rollback();
        throw error;
      }
    }

    console.log('🎉 Universal database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await database.close();
  }
}

async function seedData(client = null) {
  // Clear existing data
  console.log('🧹 Clearing existing data...');
  const clearQueries = [
    'DELETE FROM order_items',
    'DELETE FROM orders', 
    'DELETE FROM cart_items',
    'DELETE FROM wishlist_items',
    'DELETE FROM product_reviews',
    'DELETE FROM products',
    'DELETE FROM categories',
    'DELETE FROM users',
    'DELETE FROM admins'
  ];

  for (const query of clearQueries) {
    if (client) {
      await client.query(query);
    } else {
      await database.execute(query);
    }
  }

  // Read JSON files
  const dataPath = path.join(__dirname, '../../data');
  const categoriesPath = path.join(dataPath, 'categories.json');
  const productsPath = path.join(dataPath, 'products.json');

  if (!fs.existsSync(categoriesPath) || !fs.existsSync(productsPath)) {
    throw new Error('JSON data files not found. Please run "npm run generate-json" first.');
  }

  const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
  const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

  // Seed Categories
  console.log('📁 Seeding categories...');
  for (const category of categoriesData.categories) {
    if (isPostgres) {
      await client.query(
        'INSERT INTO categories (id, name, slug, description, icon, image, href, sort_order, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [category.id, category.name, category.slug, category.description, category.icon, category.image, category.href, category.sort_order, category.is_active]
      );
    } else {
      await database.execute(
        'INSERT INTO categories (id, name, slug, description, icon, image, href, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [category.id, category.name, category.slug, category.description, category.icon, category.image, category.href, category.sort_order, category.is_active]
      );
    }
  }
  console.log(`✅ Seeded ${categoriesData.categories.length} categories`);

  // Seed Products
  console.log('📦 Seeding products...');
  for (const product of productsData.products) {
    const slug = generateSlug(product.name);
    const sku = `SKU-${product.id.toString().padStart(4, '0')}`;
    
    if (isPostgres) {
      // For PostgreSQL JSONB columns, use JSON.stringify() to ensure proper serialization
      // This matches the pattern used throughout the codebase
      await client.query(
        'INSERT INTO products (id, name, slug, sku, category_id, price, original_price, stock, description, images, featured_image, specifications, shipping) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
        [
          product.id,
          product.name,
          slug,
          sku,
          product.categoryid,
          product.price,
          product.originalprice,
          product.stock,
          product.description,
          product.images ? JSON.stringify(product.images) : null,
          product.featuredImage || null,
          product.specifications ? JSON.stringify(product.specifications) : null,
          product.shipping || null
        ]
      );
    } else {
      await database.execute(
        'INSERT INTO products (id, name, slug, sku, category_id, price, original_price, stock, description, images, featured_image, specifications, shipping) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          product.id,
          product.name,
          slug,
          sku,
          product.categoryid,
          product.price,
          product.originalprice,
          product.stock,
          product.description,
          JSON.stringify(product.images),
          product.featuredImage,
          JSON.stringify(product.specifications),
          product.shipping
        ]
      );
    }
  }
  console.log(`✅ Seeded ${productsData.products.length} products`);

  // Seed Admin User
  console.log('👤 Seeding admin user...');
  const adminPassword = await hashPassword('admin123');
  const superAdminPassword = await hashPassword('superadmin123');
  if (isPostgres) {
    await client.query(
      'INSERT INTO admins (email, password, name, role) VALUES ($1, $2, $3, $4)',
      ['admin@eshop.com', adminPassword, 'Admin User', 'super_admin']
    );

    // Seed Super Admin User
    await client.query(
      'INSERT INTO admins (username, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
      ['superadmin', 'superadmin@eshop.com', superAdminPassword, 'super_admin', true]
    );
    console.log('✅ Seeded admin user (username: superadmin, password: superadmin123)');
  } else {
    await database.execute(
      'INSERT INTO admins (email, password, name, role) VALUES (?, ?, ?, ?)',
      ['admin@eshop.com', adminPassword, 'Admin User', 'super_admin']
    );
  }
  console.log('✅ Seeded admin user (email: admin@eshop.com, password: admin123)');

  // Seed Test User
  console.log('👤 Seeding test user...');
  const userPassword = await hashPassword('user123');
  
  if (isPostgres) {
    await client.query(
      'INSERT INTO users (email, password, first_name, last_name, phone, email_verified) VALUES ($1, $2, $3, $4, $5, $6)',
      ['user@eshop.com', userPassword, 'Test', 'User', '+1234567890', true]
    );
  } else {
    await database.execute(
      'INSERT INTO users (email, password, first_name, last_name, phone, email_verified) VALUES (?, ?, ?, ?, ?, ?)',
      ['user@eshop.com', userPassword, 'Test', 'User', '+1234567890', true]
    );
  }
  console.log('✅ Seeded test user (email: user@eshop.com, password: user123)');

  console.log('\n📊 Summary:');
  console.log(`📁 Categories: ${categoriesData.categories.length}`);
  console.log(`📦 Products: ${productsData.products.length}`);
  console.log(`👤 Admin: 1`);
  console.log(`👤 Test User: 1`);
  console.log(`🗄️ Database: ${isPostgres ? 'PostgreSQL' : 'SQLite'}`);
}

// Helper function for generating slugs
function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Run the script
if (require.main === module) {
  seedUniversalDatabase()
    .then(() => {
      console.log('✅ Universal seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Universal seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedUniversalDatabase, initializeDatabase }; 