const { database, initializeDatabase } = require('./init');
const { hashPassword, generateSlug, generateSKU } = require('../utils/auth');
const fs = require('fs');
const path = require('path');

async function seedWithImages() {
  try {
    console.log('🌱 Starting database seeding with migrated images...');

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

    // Read the product images config file
    const configPath = path.join(__dirname, '../../data/product-images-config.json');
    if (!fs.existsSync(configPath)) {
      throw new Error('Product images config file not found. Please run the image migration first.');
    }

    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Seed Categories
    console.log('📁 Seeding categories...');
    const categories = [
      {
        id: 1,
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and gadgets',
        icon: 'smartphone',
        image: '/static/images/categories/category_electronics.jpg',
        sort_order: 0,
        is_active: true
      },
      {
        id: 2,
        name: 'Fashion',
        slug: 'fashion',
        description: 'Clothing, shoes, and accessories',
        icon: 'shopping-bag',
        image: '/static/images/categories/category_fashion.jpg',
        sort_order: 1,
        is_active: true
      },
      {
        id: 3,
        name: 'Home & Garden',
        slug: 'home-garden',
        description: 'Home improvement and garden supplies',
        icon: 'home',
        image: '/static/images/categories/category_home_garden.jpg',
        sort_order: 2,
        is_active: true
      },
      {
        id: 4,
        name: 'Gaming',
        slug: 'gaming',
        description: 'Gaming consoles, games, and accessories',
        icon: 'gamepad-2',
        image: '/static/images/categories/category_gaming.jpg',
        sort_order: 3,
        is_active: true
      },
      {
        id: 5,
        name: 'Sports',
        slug: 'sports',
        description: 'Sports equipment and fitness gear',
        icon: 'dumbbell',
        image: '/static/images/categories/category_sports.jpg',
        sort_order: 4,
        is_active: true
      },
      {
        id: 6,
        name: 'Photography',
        slug: 'photography',
        description: 'Cameras and photography equipment',
        icon: 'camera',
        image: '/static/images/categories/category_photography.jpg',
        sort_order: 5,
        is_active: true
      },
      {
        id: 7,
        name: 'Books',
        slug: 'books',
        description: 'Books, movies, and entertainment',
        icon: 'book',
        image: '/static/images/categories/category_books.jpg',
        sort_order: 6,
        is_active: true
      },
      {
        id: 8,
        name: 'Automotive',
        slug: 'automotive',
        description: 'Car parts and automotive accessories',
        icon: 'car',
        image: '/static/images/categories/category_automotive.jpg',
        sort_order: 7,
        is_active: true
      },
      {
        id: 9,
        name: 'Music',
        slug: 'music',
        description: 'Musical instruments and audio equipment',
        icon: 'music',
        image: '/static/images/categories/category_music.jpg',
        sort_order: 8,
        is_active: true
      },
      {
        id: 10,
        name: 'Baby & Kids',
        slug: 'baby-kids',
        description: 'Baby products and children\'s items',
        icon: 'baby',
        image: '/static/images/categories/category_baby_&_kids.jpg',
        sort_order: 9,
        is_active: true
      }
    ];

    for (const category of categories) {
      await database.execute(
        'INSERT INTO categories (id, name, slug, description, icon, image, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [category.id, category.name, category.slug, category.description, category.icon, category.image, category.sort_order, category.is_active]
      );
    }
    console.log(`✅ Seeded ${categories.length} categories`);

    // Seed Products with migrated images
    console.log('📦 Seeding products with migrated images...');
    for (const product of configData.products) {
      const slug = generateSlug(product.name);
      // Use product ID to ensure unique SKU
      const sku = `SKU-${product.id.toString().padStart(4, '0')}`;
      
      await database.execute(
        'INSERT INTO products (id, name, slug, sku, category_id, price, original_price, stock, description, short_description, images, featured_image, specifications, shipping, tags, is_featured, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          product.id,
          product.name,
          slug,
          sku,
          product.categoryid,
          product.price,
          product.originalPrice || null,
          product.stock,
          product.description || '',
          product.shortDescription || '',
          JSON.stringify(product.images),
          product.featured_image,
          JSON.stringify(product.specifications || {}),
          product.shipping || '',
          JSON.stringify(product.tags || []),
          product.is_featured || false,
          'active'
        ]
      );
    }
    console.log(`✅ Seeded ${configData.products.length} products with migrated images`);

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
    console.log('🎉 Database seeding with migrated images completed successfully!');

    console.log('\n📋 Summary:');
    console.log(`   Categories: ${categories.length}`);
    console.log(`   Products: ${configData.products.length}`);
    console.log(`   All products now use local migrated images from /uploads/products/`);

    console.log('\n🔑 Test Credentials:');
    console.log('   User: user@eshop.com / user123');
    console.log('   Admin: admin@eshop.com / admin123');

  } catch (error) {
    await database.rollback();
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  seedWithImages()
    .then(() => {
      console.log('✅ Seeding with images completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedWithImages };
