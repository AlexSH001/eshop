const { database, initializeDatabase } = require('./init');
const { hashPassword, generateSlug, generateSKU } = require('../utils/auth');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Initialize database first
    await initializeDatabase();

    await database.beginTransaction();

    // Clear existing data (optional - comment out if you want to preserve data)
    console.log('🧹 Clearing existing data...');
    await database.execute('DELETE FROM order_items');
    await database.execute('DELETE FROM orders');
    await database.execute('DELETE FROM cart_items');
    await database.execute('DELETE FROM wishlist_items');
    await database.execute('DELETE FROM products');
    await database.execute('DELETE FROM categories');
    await database.execute('DELETE FROM users');
    await database.execute('DELETE FROM admins');

    // Seed Categories
    console.log('📁 Seeding categories...');
    const categories = [
      {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and gadgets',
        icon: 'smartphone'
      },
      {
        name: 'Fashion',
        slug: 'fashion',
        description: 'Clothing, shoes, and accessories',
        icon: 'shopping-bag'
      },
      {
        name: 'Home & Garden',
        slug: 'home-garden',
        description: 'Home improvement and garden supplies',
        icon: 'home'
      },
      {
        name: 'Sports',
        slug: 'sports',
        description: 'Sports equipment and fitness gear',
        icon: 'dumbbell'
      },
      {
        name: 'Gaming',
        slug: 'gaming',
        description: 'Gaming consoles, games, and accessories',
        icon: 'gamepad-2'
      },
      {
        name: 'Photography',
        slug: 'photography',
        description: 'Cameras and photography equipment',
        icon: 'camera'
      },
      {
        name: 'Books',
        slug: 'books',
        description: 'Books, movies, and entertainment',
        icon: 'book'
      },
      {
        name: 'Automotive',
        slug: 'automotive',
        description: 'Car parts and automotive accessories',
        icon: 'car'
      },
      {
        name: 'Music',
        slug: 'music',
        description: 'Musical instruments and audio equipment',
        icon: 'music'
      },
      {
        name: 'Baby & Kids',
        slug: 'baby-kids',
        description: 'Baby products and children\'s items',
        icon: 'baby'
      }
    ];

    const categoryIds = {};
    for (const category of categories) {
      const result = await database.execute(
        'INSERT INTO categories (name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
        [category.name, category.slug, category.description, category.icon, categories.indexOf(category)]
      );
      categoryIds[category.name] = result.id;
    }

    // Seed Products
    console.log('📦 Seeding products...');
    const products = [
      // Electronics
      {
        name: 'Wireless Bluetooth Headphones',
        description: 'High-quality wireless headphones with active noise cancellation, 30-hour battery life, and premium sound quality. Perfect for music, calls, and travel.',
        shortDescription: 'Premium wireless headphones with noise cancellation',
        price: 89.99,
        originalPrice: 129.99,
        category: 'Electronics',
        stock: 45,
        status: 'active',
        images: ['/uploads/products/electronics/wireless-bluetooth-headphones-20250928-27694.jpg'],
        featuredImage: '/uploads/products/electronics/wireless-bluetooth-headphones-20250928-27694.jpg',
        tags: ['wireless', 'bluetooth', 'headphones', 'audio'],
        isFeatured: true,
        specifications: {
          brand: 'TechPro',
          model: 'BT-500',
          color: 'Black',
          weight: '0.5kg'
        },
        shipping: 'Free shipping'
      },
      {
        name: 'Smartphone',
        description: 'Latest flagship smartphone with advanced camera system, powerful processor, and all-day battery life. Available in multiple colors.',
        shortDescription: 'Latest flagship smartphone with advanced features',
        price: 699.99,
        originalPrice: 799.99,
        category: 'Electronics',
        stock: 23,
        status: 'active',
        images: ['/uploads/products/electronics/smartphone-20250928-39548.jpg'],
        featuredImage: '/uploads/products/electronics/smartphone-20250928-39548.jpg',
        tags: ['smartphone', 'mobile', 'phone', 'tech'],
        isFeatured: true,
        specifications: {
          brand: 'UltraTech',
          model: 'ProMax 2023',
          storage: '128GB',
          ram: '12GB'
        },
        shipping: 'Standard shipping'
      },
      {
        name: 'Laptop',
        description: 'High-performance gaming laptop with dedicated graphics card, RGB keyboard, and fast SSD storage. Perfect for gaming and creative work.',
        shortDescription: 'High-performance gaming laptop',
        price: 999.99,
        originalPrice: 1299.99,
        category: 'Electronics',
        stock: 12,
        status: 'active',
        images: ['/uploads/products/electronics/laptop-20250928-97095.jpg'],
        featuredImage: '/uploads/products/electronics/laptop-20250928-97095.jpg',
        tags: ['laptop', 'gaming', 'computer', 'tech'],
        specifications: {
          brand: 'GamerEdge',
          processor: 'Intel Core i7',
          gpu: 'NVIDIA RTX 3060',
          ram: '16GB'
        },
        shipping: 'Express shipping'
      },
      {
        name: 'Smart Watch',
        description: 'Advanced smartwatch with health monitoring, fitness tracking, and seamless smartphone integration.',
        shortDescription: 'Advanced smartwatch with health monitoring',
        price: 299.99,
        originalPrice: 399.99,
        category: 'Electronics',
        stock: 67,
        status: 'active',
        images: ['/uploads/products/electronics/smart-watch-20250928-38357.jpg'],
        featuredImage: '/uploads/products/electronics/smart-watch-20250928-38357.jpg',
        tags: ['smartwatch', 'fitness', 'health', 'wearable'],
        specifications: {
          brand: 'FitTrack',
          model: 'Series X',
          display: 'OLED, 1.7 inches',
          battery: '400mAh'
        },
        shipping: 'Standard shipping'
      },
      {
        name: 'Earphone',
        description: 'High-quality earphones with noise cancellation, 20-hour battery life, and premium sound quality. Perfect for music, calls, and travel.',
        shortDescription: 'Premium earphones with noise cancellation',
        price: 89.99,
        originalPrice: 129.99,
        category: 'Electronics',
        stock: 45,
        status: 'active',
        images: ['/uploads/products/electronics/earphone-20250927-97807.jpg'],
        featuredImage: '/uploads/products/electronics/earphone-20250927-97807.jpg',
        tags: ['earphone', 'audio', 'noise', 'cancellation'],
        isFeatured: true,
        specifications: {
          brand: 'TechPro',
          model: 'BT-500',
          color: 'Black',
          weight: '0.5kg'
        },
        shipping: 'Free shipping'
      },
      {
        name: 'Digital Camera',
        description: 'Professional digital camera with advanced sensor technology, 4K video recording, and interchangeable lens system.',
        shortDescription: 'Professional digital camera with 4K recording',
        price: 799.99,
        originalPrice: 999.99,
        category: 'Electronics',
        stock: 99,
        status: 'active',
        images: ['/uploads/products/electronics/digital-camera-20250928-54738.jpg'],
        featuredImage: '/uploads/products/electronics/digital-camera-20250928-54738.jpg',
        tags: ['camera', 'photography', '4k', 'professional'],
        isFeatured: true,
        specifications: {
          brand: 'PhotoPro',
          sensor: '24.2MP Full Frame',
          video: '4K at 30fps',
          iso: '100-51200',
          lens: 'Interchangeable',
          stabilization: '5-axis'
        },
        shipping: 'Express shipping'
      },
      {
        name: 'Gaming Console',
        description: 'High-performance gaming console with advanced graphics, 1TB storage, and 120Hz refresh rate. Perfect for gaming and entertainment.',
        shortDescription: 'High-performance gaming console with advanced features',
        price: 499.99,
        originalPrice: 599.99,
        category: 'Electronics',
        stock: 99,
        status: 'active',
        images: ['/uploads/products/electronics/gaming-console-20250928-41450.jpg'],
        featuredImage: '/uploads/products/electronics/gaming-console-20250928-41450.jpg',
        tags: ['gaming', 'console', 'gaming', 'entertainment'],
        isFeatured: true,
        specifications: {
          brand: 'GamingPro',
          model: 'Gaming Console X',
          storage: '1TB',
          refreshRate: '120Hz',
          graphics: 'Advanced'
        },
        shipping: 'Express shipping'
      },
      {
        name: 'Bluetooth Speakers',
        description: 'High-quality Bluetooth speakers with 30-hour battery life, 100W output, and wireless connectivity. Perfect for music, calls, and travel.',
        shortDescription: 'High-quality Bluetooth speakers with 30-hour battery life',
        price: 199.99,
        originalPrice: 299.99,
        category: 'Electronics',
        stock: 99,
        status: 'active',
        images: ['/uploads/products/electronics/bluetooth-speakers-20250928-29588.jpg'],
        featuredImage: '/uploads/products/electronics/bluetooth-speakers-20250928-29588.jpg',
        tags: ['speakers', 'bluetooth', 'audio', 'wireless'],
        isFeatured: true,
        specifications: {
          brand: 'SoundPro',
          power: '100W',
          battery: '30 hours',
          connectivity: 'Bluetooth 5.0'
        },
        shipping: 'Standard shipping'
      },
      // Fashion
      {
        name: 'Premium Cotton T-Shirt',
        description: 'Soft, comfortable cotton t-shirt made from 100% organic cotton. Available in multiple colors and sizes.',
        shortDescription: 'Premium 100% organic cotton t-shirt',
        price: 24.99,
        originalPrice: 39.99,
        category: 'Fashion',
        stock: 156,
        status: 'active',
        images: ['/uploads/products/fashion/cotton-tshirt-20250928-52129.jpg'],
        featuredImage: '/uploads/products/fashion/cotton-tshirt-20250928-52129.jpg',
        tags: ['t-shirt', 'cotton', 'casual', 'organic'],
        isFeatured: true,
        specifications: {
          brand: 'Organic Cotton Co.',
          material: '100% organic cotton',
          size: 'M, L, XL',
          color: 'Multiple'
        },
        shipping: 'Standard shipping'
      },
      {
        name: 'Classic Denim Jeans',
        description: 'Classic fit denim jeans made from premium denim fabric. Comfortable and durable for everyday wear.',
        shortDescription: 'Classic fit premium denim jeans',
        price: 79.99,
        originalPrice: 99.99,
        category: 'Fashion',
        stock: 89,
        status: 'active',
        images: ['/uploads/products/fashion/classic-denim-jeans-20250928-68013.jpg'],
        featuredImage: '/uploads/products/fashion/classic-denim-jeans-20250928-68013.jpg',
        tags: ['jeans', 'denim', 'pants', 'casual'],
        specifications: {
          brand: 'Denim Master',
          style: 'Straight fit',
          wash: 'Light wash',
          size: '32, 34, 36'
        },
        shipping: 'Standard shipping'
      },
      {
        name: 'Running Sneakers',
        description: 'Lightweight running sneakers with advanced cushioning and breathable mesh upper. Perfect for daily runs and workouts.',
        shortDescription: 'Lightweight running sneakers with advanced cushioning',
        price: 129.99,
        originalPrice: 159.99,
        category: 'Fashion',
        stock: 34,
        status: 'active',
        images: ['/uploads/products/fashion/running-sneakers-20250928-88500.jpg'],
        featuredImage: '/uploads/products/fashion/running-sneakers-20250928-88500.jpg',
        tags: ['sneakers', 'running', 'shoes', 'athletic'],
        specifications: {
          brand: 'RunActive',
          type: 'Cushioned',
          material: 'Synthetic, mesh',
          color: 'Multiple'
        },
        shipping: 'Express shipping'
      },

      // Home & Garden
      {
        name: 'Modern Desk Lamp',
        description: 'Sleek modern desk lamp with adjustable brightness and USB charging port. Perfect for home office or study.',
        shortDescription: 'Modern adjustable desk lamp with USB charging',
        price: 45.99,
        originalPrice: 69.99,
        category: 'Home & Garden',
        stock: 78,
        status: 'active',
        images: ['/uploads/products/home-garden/modern-desk-lamp-20250928-27694.jpg'],
        featuredImage: '/uploads/products/home&garden/modern-desk-lamp-20250928-27694.jpg',
        tags: ['lamp', 'desk', 'lighting', 'office'],
        specifications: {
          brand: 'BrightLight',
          style: 'Modern',
          color: 'White',
          power: '60W'
        },
        shipping: 'Standard shipping'
      },
      {
        name: 'Premium Coffee Maker',
        description: 'Programmable coffee maker with thermal carafe, auto-brew timer, and multiple brewing options.',
        shortDescription: 'Programmable coffee maker with thermal carafe',
        price: 159.99,
        originalPrice: 219.99,
        category: 'Home & Garden',
        stock: 45,
        status: 'active',
        images: ['/uploads/products/home-garden/premium-coffee-maker-20250928-28699.jpg'],
        featuredImage: '/uploads/products/home&garden/premium-coffee-maker-20250928-28699.jpg',
        tags: ['coffee', 'maker', 'kitchen', 'appliance'],
        specifications: {
          brand: 'CoffeePro',
          model: 'Thermal X',
          capacity: '12 cups',
          color: 'Black'
        },
        shipping: 'Express shipping'
      },

      // Gaming
      {
        name: 'Mechanical Gaming Keyboard',
        description: 'Premium mechanical gaming keyboard with RGB backlighting, programmable keys, and tactile switches.',
        shortDescription: 'Premium mechanical keyboard with RGB lighting',
        price: 129.99,
        originalPrice: 179.99,
        category: 'Gaming',
        stock: 56,
        status: 'active',
        images: ['/uploads/products/gaming/mechanical-gaming-keyboard-20250928-27694.jpg'],
        featuredImage: '/uploads/products/gaming/mechanical-gaming-keyboard-20250928-27694.jpg',
        tags: ['keyboard', 'gaming', 'mechanical', 'rgb'],
        isFeatured: true,
        specifications: {
          brand: 'GamerKeys',
          switches: 'Cherry MX Red',
          layout: 'Full-size',
          color: 'Black'
        },
        shipping: 'Express shipping'
      },
      {
        name: 'Gaming Mouse Pro',
        description: 'High-precision gaming mouse with customizable buttons, adjustable DPI, and ergonomic design.',
        shortDescription: 'High-precision gaming mouse with customizable buttons',
        price: 79.99,
        originalPrice: 99.99,
        category: 'Gaming',
        stock: 0, // Out of stock for testing
        status: 'inactive',
        images: ['/uploads/products/gaming/gaming-mouse-pro-20250928-15197.jpg'],
        featuredImage: '/uploads/products/gaming/gaming-mouse-pro-20250928-15197.jpg',
        tags: ['mouse', 'gaming', 'precision', 'ergonomic'],
        specifications: {
          brand: 'PrecisionPro',
          dpi: '2000',
          buttons: '12',
          color: 'Black'
        },
        shipping: 'Express shipping'
      }
    ];

    for (const product of products) {
      const slug = generateSlug(product.name);
      const sku = generateSKU(product.category, product.name);
      const categoryId = categoryIds[product.category];

      await database.execute(`
        INSERT INTO products (
          name, slug, description, short_description, sku, price, original_price,
          category_id, stock, images, featured_image, tags, status, is_featured,
          specifications, shipping
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        product.name,
        slug,
        product.description,
        product.shortDescription,
        sku,
        product.price,
        product.originalPrice || null,
        categoryId,
        product.stock,
        JSON.stringify(product.images),
        product.featuredImage || product.images[0],
        JSON.stringify(product.tags),
        product.status || 'active',
        product.isFeatured || false,
        JSON.stringify(product.specifications || {}),
        product.shipping || ""
      ]);
    }

    // Seed Users
    console.log('👥 Seeding users...');
    const users = [
      {
        email: 'john.doe@example.com',
        password: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890'
      },
      {
        email: 'jane.smith@example.com',
        password: 'user123',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567891'
      },
      {
        email: 'user@eshop.com',
        password: 'user123',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567892'
      }
    ];

    for (const user of users) {
      const hashedPassword = await hashPassword(user.password);
      await database.execute(
        'INSERT INTO users (email, password, first_name, last_name, phone, email_verified) VALUES (?, ?, ?, ?, ?, ?)',
        [user.email, hashedPassword, user.firstName, user.lastName, user.phone, true]
      );
    }

    // Seed Admins
    console.log('👨‍💼 Seeding admins...');
    const admins = [
      {
        email: 'admin@eshop.com',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin'
      },
      {
        email: 'superadmin@eshop.com',
        password: 'superadmin123',
        name: 'Super Admin',
        role: 'super_admin'
      }
    ];

    for (const admin of admins) {
      const hashedPassword = await hashPassword(admin.password);
      await database.execute(
        'INSERT INTO admins (email, password, name, role) VALUES (?, ?, ?, ?)',
        [admin.email, hashedPassword, admin.name, admin.role]
      );
    }

    // Seed some sample orders
    console.log('🛒 Seeding sample orders...');
    const sampleOrders = [
      {
        orderNumber: 'ORD-001234567',
        email: 'john.doe@example.com',
        status: 'delivered',
        paymentStatus: 'paid',
        paymentMethod: 'stripe',
        total: 219.98
      },
      {
        orderNumber: 'ORD-001234568',
        email: 'jane.smith@example.com',
        status: 'shipped',
        paymentStatus: 'paid',
        paymentMethod: 'stripe',
        total: 129.99
      }
    ];

    for (const order of sampleOrders) {
      await database.execute(`
        INSERT INTO orders (
          order_number, email, status, payment_status, payment_method,
          billing_first_name, billing_last_name, billing_address_line_1,
          billing_city, billing_state, billing_postal_code, billing_country,
          shipping_first_name, shipping_last_name, shipping_address_line_1,
          shipping_city, shipping_state, shipping_postal_code, shipping_country,
          subtotal, tax_amount, shipping_amount, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        order.orderNumber,
        order.email,
        order.status,
        order.paymentStatus,
        order.paymentMethod,
        'John', 'Doe', '123 Main St',
        'New York', 'NY', '10001', 'US',
        'John', 'Doe', '123 Main St',
        'New York', 'NY', '10001', 'US',
        order.total - 20, // subtotal
        15.99, // tax
        4.99, // shipping (will be 0 for orders over $100)
        order.total
      ]);
    }

    await database.commit();

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Categories: ${categories.length}`);
    console.log(`   Products: ${products.length}`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Admins: ${admins.length}`);
    console.log(`   Sample Orders: ${sampleOrders.length}`);

    console.log('\n🔑 Test Credentials:');
    console.log('   User: user@eshop.com / user123');
    console.log('   Admin: admin@eshop.com / admin123');
    console.log('   Super Admin: superadmin@eshop.com / superadmin123');

  } catch (error) {
    await database.rollback();
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🌱 Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
