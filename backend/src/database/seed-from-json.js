const { database, initializeDatabase } = require('./init');
const { hashPassword, generateSlug, generateSKU } = require('../utils/auth');
const fs = require('fs');
const path = require('path');

async function seedFromJsonFiles() {
  try {
    console.log('🌱 Starting database seeding from JSON files...');

    // Initialize database first
    await initializeDatabase();

    await database.beginTransaction();

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await database.execute('DELETE FROM order_items');
    await database.execute('DELETE FROM orders');
    await database.execute('DELETE FROM cart_items');
    await database.execute('DELETE FROM wishlist_items');
    await database.execute('DELETE FROM product_reviews');
    await database.execute('DELETE FROM products');
    await database.execute('DELETE FROM categories');
    await database.execute('DELETE FROM users');
    await database.execute('DELETE FROM admins');

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
      await database.execute(
        'INSERT INTO categories (id, name, slug, description, icon, image, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [category.id, category.name, category.slug, category.description, category.icon, category.image, category.sort_order, category.is_active]
      );
    }
    console.log(`✅ Seeded ${categoriesData.categories.length} categories`);

    // Seed Products
    console.log('📦 Seeding products...');
    for (const product of productsData.products) {
      const slug = generateSlug(product.name);
      // Generate a unique SKU using product ID
      const sku = `SKU-${product.id.toString().padStart(4, '0')}`;
      
      await database.execute(
        'INSERT INTO products (id, name, slug, sku, category_id, price, original_price, stock, description, specifications, shipping) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
          JSON.stringify(product.specifications),
          product.shipping
        ]
      );
    }
    console.log(`✅ Seeded ${productsData.products.length} products`);

    // Seed Admin User
    console.log('👤 Seeding admin user...');
    const adminPassword = await hashPassword('admin123');
    await database.execute(
      'INSERT INTO admins (email, password, name, role) VALUES (?, ?, ?, ?)',
      ['admin@eshop.com', adminPassword, 'Admin User', 'super_admin']
    );
    console.log('✅ Seeded admin user (email: admin@eshop.com, password: admin123)');

    // Seed Test User
    console.log('👤 Seeding test user...');
    const userPassword = await hashPassword('user123');
    await database.execute(
      'INSERT INTO users (email, password, first_name, last_name, phone, email_verified) VALUES (?, ?, ?, ?, ?, ?)',
      ['user@eshop.com', userPassword, 'Test', 'User', '+1234567890', true]
    );
    console.log('✅ Seeded test user (email: user@eshop.com, password: user123)');

    await database.commit();
    console.log('🎉 Database seeding completed successfully!');

  } catch (error) {
    await database.rollback();
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  seedFromJsonFiles()
    .then(() => {
      console.log('✅ Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedFromJsonFiles }; 