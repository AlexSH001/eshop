const { database, initializeDatabase } = require('./init');
const { hashPassword, generateSlug, generateSKU } = require('../utils/auth');
const fs = require('fs');
const path = require('path');

async function seedCompleteDatabase() {
  try {
    console.log('🌱 Starting complete database seeding...');

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

    // Read JSON files for categories and products
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
        'INSERT INTO categories (id, name, slug, description, icon, image, href, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [category.id, category.name, category.slug, category.description, category.icon, category.image, category.href, category.sort_order, category.is_active]
      );
    }
    console.log(`✅ Seeded ${categoriesData.categories.length} categories`);

    // Seed Products
    console.log('📦 Seeding products...');
    for (const product of productsData.products) {
      await database.execute(
        'INSERT INTO products (id, name, category_id, price, original_price, stock, description, specifications, shipping) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          product.id,
          product.name,
          product.categoryid,
          product.price,
          product.originalprice,
          product.stock,
          product.description,
          JSON.stringify(product.specifications),
          product.shipping
        ]
      );

      // Insert product images
      for (const image of product.images) {
        await database.execute(
          'INSERT INTO product_images (product_id, image_url, download_link) VALUES (?, ?, ?)',
          [product.id, image.image, image.download_link]
        );
      }
    }
    console.log(`✅ Seeded ${productsData.products.length} products`);

    // Seed Admin User
    console.log('👤 Seeding admin user...');
    const adminPassword = await hashPassword('admin123');
    await database.execute(
      'INSERT INTO admins (username, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
      ['admin', 'admin@eshop.com', adminPassword, 'super_admin', true]
    );
    console.log('✅ Seeded admin user (username: admin, password: admin123)');

    // Seed Test User
    console.log('👤 Seeding test user...');
    const userPassword = await hashPassword('user123');
    await database.execute(
      'INSERT INTO users (username, email, password_hash, first_name, last_name, phone, is_active, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['user', 'user@eshop.com', userPassword, 'Test', 'User', '+1234567890', true, true]
    );
    console.log('✅ Seeded test user (username: user, password: user123)');

    await database.commit();
    console.log('🎉 Database seeding completed successfully!');
    
    console.log('\n📊 Summary:');
    console.log(`📁 Categories: ${categoriesData.categories.length}`);
    console.log(`📦 Products: ${productsData.products.length}`);
    console.log(`👤 Admin: 1`);
    console.log(`👤 Test User: 1`);
    
  } catch (error) {
    await database.rollback();
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await database.close();
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedCompleteDatabase().catch(console.error);
}

module.exports = { seedCompleteDatabase }; 