const { database, initializeDatabase } = require('./init');
const { hashPassword, generateSlug, generateSKU } = require('../utils/auth');

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

    // Seed Categories
    console.log('📁 Seeding categories...');
    const categories = [
      {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Phones, Laptops, Gadgets',
        icon: 'smartphone',
        image: '/uploads/images/category_electronics.jpg',
        sortOrder: 0
      },
      {
        name: 'Fashion',
        slug: 'fashion',
        description: 'Clothing, Shoes, Accessories',
        icon: 'shopping-bag',
        image: '/uploads/images/category_fashion.jpg',
        sortOrder: 1
      },
      {
        name: 'Home & Garden',
        slug: 'home-garden',
        description: 'Furniture, Decor, Tools',
        icon: 'home',
        image: '/uploads/images/category_home_&_garden.jpg',
        sortOrder: 2
      },
      {
        name: 'Gaming',
        slug: 'gaming',
        description: 'Consoles, Games, Accessories',
        icon: 'gamepad-2',
        image: '/uploads/images/category_gaming.jpg',
        sortOrder: 3
      },
      {
        name: 'Sports',
        slug: 'sports',
        description: 'Fitness, Camping, Sports',
        icon: 'dumbbell',
        image: '/uploads/images/category_sports.jpg',
        sortOrder: 4
      },
      {
        name: 'Photography',
        slug: 'photography',
        description: 'Cameras, Lenses, Equipment',
        icon: 'camera',
        image: '/uploads/images/category_photography.jpg',
        sortOrder: 5
      },
      {
        name: 'Books',
        slug: 'books',
        description: 'Books, Movies, Music',
        icon: 'book',
        image: '/uploads/images/category_books.jpg',
        sortOrder: 6
      },
      {
        name: 'Automotive',
        slug: 'automotive',
        description: 'Parts, Accessories, Tools',
        icon: 'car',
        image: '/uploads/images/category_automotive.jpg',
        sortOrder: 7
      },
      {
        name: 'Music',
        slug: 'music',
        description: 'Instruments, Audio, Equipment',
        icon: 'music',
        image: '/uploads/images/category_music.jpg',
        sortOrder: 8
      },
      {
        name: 'Baby & Kids',
        slug: 'baby-kids',
        description: 'Toys, Clothes, Safety',
        icon: 'baby',
        image: '/uploads/images/category_baby_&_kids.jpg',
        sortOrder: 9
      }
    ];

    const categoryIds = {};
    for (const category of categories) {
      const result = await database.execute(
        'INSERT INTO categories (name, slug, description, icon, image, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [category.name, category.slug, category.description, category.icon, category.image, category.sortOrder]
      );
      categoryIds[category.name] = result.id;
      console.log(`✅ Added category: ${category.name}`);
    }

    // Seed Products
    console.log('📦 Seeding products...');
    
    // Electronics Products
    const electronicsProducts = [
      {
        name: "Wireless Bluetooth Headphones",
        description: "High-quality wireless headphones with active noise cancellation, 30-hour battery life, and premium sound quality. Perfect for music, calls, and travel.",
        shortDescription: "Premium wireless headphones with noise cancellation",
        price: 89.99,
        originalPrice: 129.99,
        categoryId: categoryIds['Electronics'],
        stock: 45,
        images: JSON.stringify(['/uploads/images/product_1001.jpg']),
        featuredImage: '/uploads/images/product_1001.jpg',
        tags: JSON.stringify(['wireless', 'bluetooth', 'headphones', 'audio']),
        isFeatured: true,
        specifications: JSON.stringify({
          brand: 'TechPro',
          model: 'BT-500',
          color: 'Black',
          weight: '0.5kg',
          battery: '30 hours',
          connectivity: 'Bluetooth 5.0'
        }),
        shipping: 'Free shipping'
      },
      {
        name: "Smart Phone",
        description: "Latest flagship smartphone with advanced camera system, powerful processor, and all-day battery life. Available in multiple colors.",
        shortDescription: "Latest flagship smartphone with advanced features",
        price: 699.99,
        originalPrice: 799.99,
        categoryId: categoryIds['Electronics'],
        stock: 23,
        images: JSON.stringify(['/uploads/images/product_1002.jpg']),
        featuredImage: '/uploads/images/product_1002.jpg',
        tags: JSON.stringify(['smartphone', 'mobile', 'phone', 'tech']),
        isFeatured: true,
        specifications: JSON.stringify({
          brand: 'UltraTech',
          model: 'ProMax 2023',
          storage: '128GB',
          ram: '12GB',
          screen: '6.7 inch OLED'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Laptop",
        description: "High-performance laptop with dedicated graphics card, RGB keyboard, and fast SSD storage. Perfect for work and gaming.",
        shortDescription: "High-performance laptop for work and gaming",
        price: 999.99,
        originalPrice: 1299.99,
        categoryId: categoryIds['Electronics'],
        stock: 12,
        images: JSON.stringify(['/uploads/images/product_1003.jpg']),
        featuredImage: '/uploads/images/product_1003.jpg',
        tags: JSON.stringify(['laptop', 'computer', 'tech', 'gaming']),
        specifications: JSON.stringify({
          brand: 'GamerEdge',
          processor: 'Intel Core i7',
          gpu: 'NVIDIA RTX 3060',
          ram: '16GB',
          storage: '512GB SSD'
        }),
        shipping: 'Express shipping'
      },
      {
        name: "Smart Watch",
        description: "Advanced smartwatch with health monitoring, fitness tracking, and seamless smartphone integration.",
        shortDescription: "Advanced smartwatch with health monitoring",
        price: 299.99,
        originalPrice: 399.99,
        categoryId: categoryIds['Electronics'],
        stock: 67,
        images: JSON.stringify(['/uploads/images/product_1004.jpg']),
        featuredImage: '/uploads/images/product_1004.jpg',
        tags: JSON.stringify(['smartwatch', 'fitness', 'health', 'wearable']),
        specifications: JSON.stringify({
          brand: 'FitTrack',
          model: 'Series X',
          display: 'OLED, 1.7 inches',
          battery: '400mAh',
          waterResistant: '5ATM'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Tablet",
        description: "Versatile tablet perfect for entertainment, productivity, and creativity. High-resolution display and long battery life.",
        shortDescription: "Versatile tablet for entertainment and productivity",
        price: 449.99,
        originalPrice: 549.99,
        categoryId: categoryIds['Electronics'],
        stock: 34,
        images: JSON.stringify(['/uploads/images/product_1005.jpg']),
        featuredImage: '/uploads/images/product_1005.jpg',
        tags: JSON.stringify(['tablet', 'ipad', 'entertainment', 'productivity']),
        specifications: JSON.stringify({
          brand: 'TechTab',
          screen: '10.9 inch Retina',
          storage: '256GB',
          processor: 'A14 Bionic',
          battery: '10 hours'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Digital Camera",
        description: "Professional digital camera with advanced autofocus, 4K video recording, and interchangeable lenses.",
        shortDescription: "Professional digital camera with 4K video",
        price: 799.99,
        originalPrice: 999.99,
        categoryId: categoryIds['Electronics'],
        stock: 18,
        images: JSON.stringify(['/uploads/images/product_1006.jpg']),
        featuredImage: '/uploads/images/product_1006.jpg',
        tags: JSON.stringify(['camera', 'photography', '4k', 'professional']),
        specifications: JSON.stringify({
          brand: 'PhotoPro',
          sensor: '24.1MP APS-C',
          video: '4K 30fps',
          autofocus: '4779 points',
          connectivity: 'WiFi, Bluetooth'
        }),
        shipping: 'Express shipping'
      },
      {
        name: "Gaming Console",
        description: "Next-generation gaming console with ray tracing, 4K gaming, and lightning-fast loading times.",
        shortDescription: "Next-generation gaming console",
        price: 499.99,
        originalPrice: 599.99,
        categoryId: categoryIds['Electronics'],
        stock: 25,
        images: JSON.stringify(['/uploads/images/product_1007.jpg']),
        featuredImage: '/uploads/images/product_1007.jpg',
        tags: JSON.stringify(['gaming', 'console', '4k', 'ray-tracing']),
        specifications: JSON.stringify({
          brand: 'GameStation',
          storage: '1TB SSD',
          resolution: '4K 120fps',
          rayTracing: 'Yes',
          backwardCompatible: 'Yes'
        }),
        shipping: 'Express shipping'
      },
      {
        name: "Bluetooth Speakers",
        description: "Portable Bluetooth speakers with 360-degree sound, waterproof design, and 20-hour battery life.",
        shortDescription: "Portable waterproof Bluetooth speakers",
        price: 199.99,
        originalPrice: 299.99,
        categoryId: categoryIds['Electronics'],
        stock: 89,
        images: JSON.stringify(['/uploads/images/product_1008.jpg']),
        featuredImage: '/uploads/images/product_1008.jpg',
        tags: JSON.stringify(['speakers', 'bluetooth', 'portable', 'waterproof']),
        specifications: JSON.stringify({
          brand: 'SoundWave',
          power: '40W',
          battery: '20 hours',
          waterproof: 'IPX7',
          connectivity: 'Bluetooth 5.0'
        }),
        shipping: 'Standard shipping'
      }
    ];

    // Fashion Products
    const fashionProducts = [
      {
        name: "Cotton T-Shirt",
        description: "Soft, comfortable cotton t-shirt made from 100% organic cotton. Available in multiple colors and sizes.",
        shortDescription: "Premium 100% organic cotton t-shirt",
        price: 24.99,
        originalPrice: 39.99,
        categoryId: categoryIds['Fashion'],
        stock: 156,
        images: JSON.stringify(['/uploads/images/product_2001.jpg']),
        featuredImage: '/uploads/images/product_2001.jpg',
        tags: JSON.stringify(['t-shirt', 'cotton', 'casual', 'organic']),
        isFeatured: true,
        specifications: JSON.stringify({
          brand: 'Organic Cotton Co.',
          material: '100% organic cotton',
          sizes: 'XS, S, M, L, XL, XXL',
          colors: 'White, Black, Navy, Gray',
          care: 'Machine wash cold'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Denim Jeans",
        description: "Classic fit denim jeans made from premium denim fabric. Comfortable and durable for everyday wear.",
        shortDescription: "Classic fit premium denim jeans",
        price: 79.99,
        originalPrice: 99.99,
        categoryId: categoryIds['Fashion'],
        stock: 89,
        images: JSON.stringify(['/uploads/images/product_2002.jpg']),
        featuredImage: '/uploads/images/product_2002.jpg',
        tags: JSON.stringify(['jeans', 'denim', 'casual', 'classic']),
        specifications: JSON.stringify({
          brand: 'DenimCo',
          material: '98% cotton, 2% elastane',
          fit: 'Classic',
          sizes: '28-40',
          colors: 'Blue, Black, Gray'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Sneakers",
        description: "Comfortable and stylish sneakers perfect for everyday wear. Lightweight design with excellent cushioning.",
        shortDescription: "Comfortable and stylish sneakers",
        price: 129.99,
        originalPrice: 159.99,
        categoryId: categoryIds['Fashion'],
        stock: 67,
        images: JSON.stringify(['/uploads/images/product_2003.jpg']),
        featuredImage: '/uploads/images/product_2003.jpg',
        tags: JSON.stringify(['sneakers', 'shoes', 'casual', 'comfortable']),
        specifications: JSON.stringify({
          brand: 'ComfortStep',
          material: 'Mesh upper, rubber sole',
          sizes: '7-12',
          colors: 'White, Black, Gray, Red',
          cushioning: 'Air-cushioned midsole'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Leather Jacket",
        description: "Classic leather jacket with premium leather construction. Timeless style that never goes out of fashion.",
        shortDescription: "Classic premium leather jacket",
        price: 199.99,
        originalPrice: 299.99,
        categoryId: categoryIds['Fashion'],
        stock: 34,
        images: JSON.stringify(['/uploads/images/product_2004.jpg']),
        featuredImage: '/uploads/images/product_2004.jpg',
        tags: JSON.stringify(['jacket', 'leather', 'classic', 'premium']),
        specifications: JSON.stringify({
          brand: 'LeatherCraft',
          material: 'Genuine leather',
          sizes: 'S, M, L, XL',
          colors: 'Black, Brown',
          lining: 'Polyester'
        }),
        shipping: 'Express shipping'
      },
      {
        name: "Summer Dress",
        description: "Lightweight summer dress perfect for warm weather. Flowy design with beautiful floral pattern.",
        shortDescription: "Lightweight summer dress with floral pattern",
        price: 89.99,
        originalPrice: 119.99,
        categoryId: categoryIds['Fashion'],
        stock: 45,
        images: JSON.stringify(['/uploads/images/product_2005.jpg']),
        featuredImage: '/uploads/images/product_2005.jpg',
        tags: JSON.stringify(['dress', 'summer', 'floral', 'lightweight']),
        specifications: JSON.stringify({
          brand: 'SummerStyle',
          material: '100% cotton',
          sizes: 'XS, S, M, L, XL',
          colors: 'Blue Floral, Pink Floral',
          care: 'Machine wash cold'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Sunglasses",
        description: "Stylish sunglasses with UV protection and polarized lenses. Perfect for sunny days and outdoor activities.",
        shortDescription: "Stylish sunglasses with UV protection",
        price: 49.99,
        originalPrice: 79.99,
        categoryId: categoryIds['Fashion'],
        stock: 78,
        images: JSON.stringify(['/uploads/images/product_2006.jpg']),
        featuredImage: '/uploads/images/product_2006.jpg',
        tags: JSON.stringify(['sunglasses', 'uv-protection', 'polarized', 'stylish']),
        specifications: JSON.stringify({
          brand: 'SunShield',
          lens: 'Polarized',
          uvProtection: '100%',
          frame: 'Metal',
          colors: 'Black, Brown, Blue'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Winter Coat",
        description: "Warm and stylish winter coat with insulation and water-resistant exterior. Perfect for cold weather.",
        shortDescription: "Warm and stylish winter coat",
        price: 249.99,
        originalPrice: 349.99,
        categoryId: categoryIds['Fashion'],
        stock: 23,
        images: JSON.stringify(['/uploads/images/product_2007.jpg']),
        featuredImage: '/uploads/images/product_2007.jpg',
        tags: JSON.stringify(['coat', 'winter', 'warm', 'water-resistant']),
        specifications: JSON.stringify({
          brand: 'WinterWear',
          material: 'Polyester with insulation',
          sizes: 'S, M, L, XL, XXL',
          colors: 'Black, Navy, Gray',
          waterResistant: 'Yes'
        }),
        shipping: 'Express shipping'
      },
      {
        name: "Handbag",
        description: "Elegant handbag with multiple compartments and premium leather construction. Perfect for everyday use.",
        shortDescription: "Elegant leather handbag with compartments",
        price: 159.99,
        originalPrice: 199.99,
        categoryId: categoryIds['Fashion'],
        stock: 56,
        images: JSON.stringify(['/uploads/images/product_2008.jpg']),
        featuredImage: '/uploads/images/product_2008.jpg',
        tags: JSON.stringify(['handbag', 'leather', 'elegant', 'practical']),
        specifications: JSON.stringify({
          brand: 'EleganceCo',
          material: 'Genuine leather',
          compartments: 'Multiple',
          colors: 'Black, Brown, Tan',
          closure: 'Zipper'
        }),
        shipping: 'Standard shipping'
      }
    ];

    // Home & Garden Products
    const homeGardenProducts = [
      {
        name: "Desk Lamp",
        description: "Modern desk lamp with adjustable brightness and color temperature. Perfect for work and study.",
        shortDescription: "Modern adjustable desk lamp",
        price: 45.99,
        originalPrice: 69.99,
        categoryId: categoryIds['Home & Garden'],
        stock: 78,
        images: JSON.stringify(['/uploads/images/product_3001.jpg']),
        featuredImage: '/uploads/images/product_3001.jpg',
        tags: JSON.stringify(['lamp', 'desk', 'adjustable', 'modern']),
        specifications: JSON.stringify({
          brand: 'LightCo',
          power: '10W LED',
          brightness: 'Adjustable',
          colorTemp: '3000K-6500K',
          material: 'Aluminum'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Coffee Maker",
        description: "Programmable coffee maker with thermal carafe and multiple brewing options. Perfect for coffee lovers.",
        shortDescription: "Programmable coffee maker with thermal carafe",
        price: 159.99,
        originalPrice: 219.99,
        categoryId: categoryIds['Home & Garden'],
        stock: 34,
        images: JSON.stringify(['/uploads/images/product_3002.jpg']),
        featuredImage: '/uploads/images/product_3002.jpg',
        tags: JSON.stringify(['coffee', 'maker', 'programmable', 'thermal']),
        specifications: JSON.stringify({
          brand: 'BrewMaster',
          capacity: '12 cups',
          programmable: 'Yes',
          thermal: 'Yes',
          autoShutoff: 'Yes'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Plant Pot",
        description: "Beautiful ceramic plant pot with drainage hole. Perfect for indoor and outdoor plants.",
        shortDescription: "Beautiful ceramic plant pot",
        price: 29.99,
        originalPrice: 39.99,
        categoryId: categoryIds['Home & Garden'],
        stock: 123,
        images: JSON.stringify(['/uploads/images/product_3003.jpg']),
        featuredImage: '/uploads/images/product_3003.jpg',
        tags: JSON.stringify(['pot', 'plant', 'ceramic', 'drainage']),
        specifications: JSON.stringify({
          brand: 'GardenCo',
          material: 'Ceramic',
          size: '8 inch',
          drainage: 'Yes',
          colors: 'White, Terracotta, Blue'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Throw Pillow",
        description: "Soft and decorative throw pillow perfect for adding comfort and style to any room.",
        shortDescription: "Soft decorative throw pillow",
        price: 19.99,
        originalPrice: 29.99,
        categoryId: categoryIds['Home & Garden'],
        stock: 89,
        images: JSON.stringify(['/uploads/images/product_3004.jpg']),
        featuredImage: '/uploads/images/product_3004.jpg',
        tags: JSON.stringify(['pillow', 'throw', 'decorative', 'soft']),
        specifications: JSON.stringify({
          brand: 'ComfortCo',
          material: 'Polyester',
          size: '18x18 inches',
          fill: 'Polyester fiber',
          colors: 'Multiple patterns'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Candle Set",
        description: "Aromatic candle set with long burn time and beautiful fragrances. Perfect for creating ambiance.",
        shortDescription: "Aromatic candle set with long burn time",
        price: 39.99,
        originalPrice: 59.99,
        categoryId: categoryIds['Home & Garden'],
        stock: 67,
        images: JSON.stringify(['/uploads/images/product_3005.jpg']),
        featuredImage: '/uploads/images/product_3005.jpg',
        tags: JSON.stringify(['candles', 'aromatic', 'set', 'ambiance']),
        specifications: JSON.stringify({
          brand: 'AromaCo',
          material: 'Soy wax',
          burnTime: '40 hours',
          fragrances: 'Lavender, Vanilla, Citrus',
          count: '3 candles'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Wall Art",
        description: "Beautiful wall art piece that adds character and style to any room. High-quality canvas print.",
        shortDescription: "Beautiful canvas wall art",
        price: 89.99,
        originalPrice: 129.99,
        categoryId: categoryIds['Home & Garden'],
        stock: 23,
        images: JSON.stringify(['/uploads/images/product_3006.jpg']),
        featuredImage: '/uploads/images/product_3006.jpg',
        tags: JSON.stringify(['art', 'wall', 'canvas', 'decorative']),
        specifications: JSON.stringify({
          brand: 'ArtCo',
          material: 'Canvas',
          size: '24x36 inches',
          frame: 'Wooden',
          style: 'Abstract'
        }),
        shipping: 'Express shipping'
      },
      {
        name: "Garden Tools",
        description: "Essential garden tool set for maintaining your garden. High-quality tools with comfortable handles.",
        shortDescription: "Essential garden tool set",
        price: 79.99,
        originalPrice: 99.99,
        categoryId: categoryIds['Home & Garden'],
        stock: 45,
        images: JSON.stringify(['/uploads/images/product_3007.jpg']),
        featuredImage: '/uploads/images/product_3007.jpg',
        tags: JSON.stringify(['tools', 'garden', 'set', 'essential']),
        specifications: JSON.stringify({
          brand: 'GardenTools',
          material: 'Stainless steel',
          handle: 'Ergonomic',
          includes: 'Trowel, Pruner, Rake, Gloves',
          storage: 'Carrying case'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Storage Box",
        description: "Versatile storage box perfect for organizing any space. Durable construction with secure lid.",
        shortDescription: "Versatile storage box for organization",
        price: 49.99,
        originalPrice: 69.99,
        categoryId: categoryIds['Home & Garden'],
        stock: 78,
        images: JSON.stringify(['/uploads/images/product_3008.jpg']),
        featuredImage: '/uploads/images/product_3008.jpg',
        tags: JSON.stringify(['storage', 'box', 'organization', 'versatile']),
        specifications: JSON.stringify({
          brand: 'OrganizeCo',
          material: 'Plastic',
          size: '18x12x8 inches',
          stackable: 'Yes',
          colors: 'Clear, White, Black'
        }),
        shipping: 'Standard shipping'
      }
    ];

    // Gaming Products
    const gamingProducts = [
      {
        name: "Mechanical Keyboard",
        description: "High-quality mechanical keyboard with RGB lighting and customizable switches. Perfect for gaming and typing.",
        shortDescription: "RGB mechanical keyboard with customizable switches",
        price: 129.99,
        originalPrice: 179.99,
        categoryId: categoryIds['Gaming'],
        stock: 34,
        images: JSON.stringify(['/uploads/images/product_4009.jpg']),
        featuredImage: '/uploads/images/product_4009.jpg',
        tags: JSON.stringify(['keyboard', 'mechanical', 'rgb', 'gaming']),
        specifications: JSON.stringify({
          brand: 'GameTech',
          switches: 'Cherry MX Red',
          rgb: 'Yes',
          connectivity: 'USB-C',
          layout: 'Full size'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Gaming Mouse",
        description: "Precision gaming mouse with adjustable DPI and programmable buttons. Perfect for competitive gaming.",
        shortDescription: "Precision gaming mouse with adjustable DPI",
        price: 79.99,
        originalPrice: 99.99,
        categoryId: categoryIds['Gaming'],
        stock: 56,
        images: JSON.stringify(['/uploads/images/product_4000.jpg']),
        featuredImage: '/uploads/images/product_4000.jpg',
        tags: JSON.stringify(['mouse', 'gaming', 'precision', 'programmable']),
        specifications: JSON.stringify({
          brand: 'PrecisionGaming',
          dpi: 'Up to 25,600',
          buttons: '7 programmable',
          rgb: 'Yes',
          weight: '95g'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Gaming Headset",
        description: "Immersive gaming headset with 7.1 surround sound and noise-canceling microphone.",
        shortDescription: "7.1 surround sound gaming headset",
        price: 149.99,
        originalPrice: 199.99,
        categoryId: categoryIds['Gaming'],
        stock: 45,
        images: JSON.stringify(['/uploads/images/product_4001.jpg']),
        featuredImage: '/uploads/images/product_4001.jpg',
        tags: JSON.stringify(['headset', 'gaming', 'surround', 'microphone']),
        specifications: JSON.stringify({
          brand: 'AudioGaming',
          sound: '7.1 Surround',
          microphone: 'Noise-canceling',
          connectivity: 'USB/3.5mm',
          rgb: 'Yes'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Controller",
        description: "Wireless gaming controller with ergonomic design and responsive buttons. Compatible with multiple platforms.",
        shortDescription: "Wireless gaming controller",
        price: 59.99,
        originalPrice: 79.99,
        categoryId: categoryIds['Gaming'],
        stock: 67,
        images: JSON.stringify(['/uploads/images/product_4002.jpg']),
        featuredImage: '/uploads/images/product_4002.jpg',
        tags: JSON.stringify(['controller', 'wireless', 'gaming', 'ergonomic']),
        specifications: JSON.stringify({
          brand: 'GameControl',
          connectivity: 'Bluetooth/USB',
          battery: '40 hours',
          vibration: 'Yes',
          compatibility: 'PC, Mobile'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Gaming Chair",
        description: "Ergonomic gaming chair with lumbar support and adjustable features. Perfect for long gaming sessions.",
        shortDescription: "Ergonomic gaming chair with lumbar support",
        price: 299.99,
        originalPrice: 399.99,
        categoryId: categoryIds['Gaming'],
        stock: 23,
        images: JSON.stringify(['/uploads/images/product_4003.jpg']),
        featuredImage: '/uploads/images/product_4003.jpg',
        tags: JSON.stringify(['chair', 'gaming', 'ergonomic', 'lumbar']),
        specifications: JSON.stringify({
          brand: 'ComfortGaming',
          material: 'PU leather',
          weight: '150kg max',
          adjustable: 'Height, armrests, back',
          lumbar: 'Yes'
        }),
        shipping: 'Express shipping'
      },
      {
        name: "Gaming Monitor",
        description: "High-refresh gaming monitor with 1ms response time and adaptive sync technology.",
        shortDescription: "High-refresh gaming monitor with 1ms response",
        price: 399.99,
        originalPrice: 499.99,
        categoryId: categoryIds['Gaming'],
        stock: 18,
        images: JSON.stringify(['/uploads/images/product_4004.jpg']),
        featuredImage: '/uploads/images/product_4004.jpg',
        tags: JSON.stringify(['monitor', 'gaming', 'high-refresh', '1ms']),
        specifications: JSON.stringify({
          brand: 'DisplayGaming',
          size: '27 inch',
          resolution: '2560x1440',
          refresh: '165Hz',
          response: '1ms'
        }),
        shipping: 'Express shipping'
      },
      {
        name: "Gaming Desk",
        description: "Spacious gaming desk with cable management and ergonomic design. Perfect for gaming setup.",
        shortDescription: "Spacious gaming desk with cable management",
        price: 249.99,
        originalPrice: 329.99,
        categoryId: categoryIds['Gaming'],
        stock: 12,
        images: JSON.stringify(['/uploads/images/product_4005.jpg']),
        featuredImage: '/uploads/images/product_4005.jpg',
        tags: JSON.stringify(['desk', 'gaming', 'spacious', 'cable-management']),
        specifications: JSON.stringify({
          brand: 'DeskGaming',
          material: 'MDF and steel',
          size: '55x28 inches',
          cableManagement: 'Yes',
          weight: '80kg max'
        }),
        shipping: 'Express shipping'
      },
      {
        name: "RGB Lighting",
        description: "Smart RGB lighting strips with app control and music sync. Perfect for gaming room ambiance.",
        shortDescription: "Smart RGB lighting with music sync",
        price: 89.99,
        originalPrice: 119.99,
        categoryId: categoryIds['Gaming'],
        stock: 89,
        images: JSON.stringify(['/uploads/images/product_4006.jpg']),
        featuredImage: '/uploads/images/product_4006.jpg',
        tags: JSON.stringify(['rgb', 'lighting', 'smart', 'music-sync']),
        specifications: JSON.stringify({
          brand: 'LightGaming',
          length: '16.4 feet',
          connectivity: 'WiFi/Bluetooth',
          musicSync: 'Yes',
          appControl: 'Yes'
        }),
        shipping: 'Standard shipping'
      }
    ];

    // Sports Products
    const sportsProducts = [
      {
        name: "Running Shoes",
        description: "Lightweight running shoes with excellent cushioning and breathable mesh upper. Perfect for daily runs.",
        shortDescription: "Lightweight running shoes with cushioning",
        price: 89.99,
        originalPrice: 129.99,
        categoryId: categoryIds['Sports'],
        stock: 67,
        images: JSON.stringify(['/uploads/images/product_5007.jpg']),
        featuredImage: '/uploads/images/product_5007.jpg',
        tags: JSON.stringify(['shoes', 'running', 'lightweight', 'cushioning']),
        specifications: JSON.stringify({
          brand: 'RunFast',
          material: 'Mesh upper, rubber sole',
          cushioning: 'Air-cushioned',
          weight: '280g',
          sizes: '7-12'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Yoga Mat",
        description: "Non-slip yoga mat with excellent grip and cushioning. Perfect for yoga, pilates, and fitness.",
        shortDescription: "Non-slip yoga mat with excellent grip",
        price: 29.99,
        originalPrice: 49.99,
        categoryId: categoryIds['Sports'],
        stock: 123,
        images: JSON.stringify(['/uploads/images/product_5008.jpg']),
        featuredImage: '/uploads/images/product_5008.jpg',
        tags: JSON.stringify(['mat', 'yoga', 'non-slip', 'fitness']),
        specifications: JSON.stringify({
          brand: 'YogaCo',
          material: 'TPE',
          thickness: '6mm',
          size: '72x24 inches',
          weight: '2.5kg'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Dumbbells Set",
        description: "Adjustable dumbbells set with multiple weight options. Perfect for home workouts and strength training.",
        shortDescription: "Adjustable dumbbells set for home workouts",
        price: 79.99,
        originalPrice: 99.99,
        categoryId: categoryIds['Sports'],
        stock: 45,
        images: JSON.stringify(['/uploads/images/product_5009.jpg']),
        featuredImage: '/uploads/images/product_5009.jpg',
        tags: JSON.stringify(['dumbbells', 'adjustable', 'strength', 'home-workout']),
        specifications: JSON.stringify({
          brand: 'StrengthCo',
          weight: '5-50 lbs',
          material: 'Cast iron',
          adjustable: 'Yes',
          storage: 'Rack included'
        }),
        shipping: 'Express shipping'
      },
      {
        name: "Sports Water Bottle",
        description: "Insulated sports water bottle that keeps drinks cold for 24 hours. Perfect for workouts and sports.",
        shortDescription: "Insulated sports water bottle",
        price: 19.99,
        originalPrice: 29.99,
        categoryId: categoryIds['Sports'],
        stock: 156,
        images: JSON.stringify(['/uploads/images/product_5000.jpg']),
        featuredImage: '/uploads/images/product_5000.jpg',
        tags: JSON.stringify(['bottle', 'water', 'insulated', 'sports']),
        specifications: JSON.stringify({
          brand: 'HydrateCo',
          capacity: '32 oz',
          insulation: '24 hours cold',
          material: 'Stainless steel',
          colors: 'Multiple'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Fitness Tracker",
        description: "Advanced fitness tracker with heart rate monitoring, GPS, and sleep tracking. Perfect for health monitoring.",
        shortDescription: "Advanced fitness tracker with heart rate monitoring",
        price: 149.99,
        originalPrice: 199.99,
        categoryId: categoryIds['Sports'],
        stock: 78,
        images: JSON.stringify(['/uploads/images/product_5001.jpg']),
        featuredImage: '/uploads/images/product_5001.jpg',
        tags: JSON.stringify(['tracker', 'fitness', 'heart-rate', 'gps']),
        specifications: JSON.stringify({
          brand: 'FitTrack',
          display: 'OLED touchscreen',
          battery: '7 days',
          waterproof: '5ATM',
          gps: 'Yes'
        }),
        shipping: 'Standard shipping'
      },
      {
        name: "Tennis Racket",
        description: "Professional tennis racket with excellent control and power. Perfect for intermediate to advanced players.",
        shortDescription: "Professional tennis racket with control and power",
        price: 99.99,
        originalPrice: 149.99,
        categoryId: categoryIds['Sports'],
        stock: 34,
        images: JSON.stringify(['/uploads/images/product_5002.jpg']),
        featuredImage: '/uploads/images/product_5002.jpg',
        tags: JSON.stringify(['racket', 'tennis', 'professional', 'control']),
        specifications: JSON.stringify({
          brand: 'TennisPro',
          headSize: '100 sq inches',
          weight: '300g',
          stringPattern: '16x19',
          grip: '4 3/8 inches'
        }),
        shipping: 'Standard shipping'
      }
    ];

    // Combine all products
    const allProducts = [
      ...electronicsProducts,
      ...fashionProducts,
      ...homeGardenProducts,
      ...gamingProducts,
      ...sportsProducts
    ];

    // Insert all products
    for (const product of allProducts) {
      const slug = generateSlug(product.name);
      const sku = generateSKU(product.name);
      
      await database.execute(
        `INSERT INTO products (
          name, slug, description, short_description, sku, price, original_price, 
          category_id, stock, images, featured_image, tags, is_featured, 
          specifications, shipping, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.name, slug, product.description, product.shortDescription, sku,
          product.price, product.originalPrice, product.categoryId, product.stock,
          product.images, product.featuredImage, product.tags, product.isFeatured || false,
          product.specifications, product.shipping, 'active'
        ]
      );
      console.log(`✅ Added product: ${product.name}`);
    }

    // Seed sample users
    console.log('👥 Seeding sample users...');
    const hashedPassword = await hashPassword('password123');
    
    const users = [
      {
        email: 'john.doe@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890'
      },
      {
        email: 'jane.smith@example.com',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567891'
      },
      {
        email: 'admin@eshop.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        phone: '+1234567892'
      }
    ];

    for (const user of users) {
      await database.execute(
        'INSERT INTO users (email, password, first_name, last_name, phone, email_verified) VALUES (?, ?, ?, ?, ?, ?)',
        [user.email, user.password, user.firstName, user.lastName, user.phone, true]
      );
      console.log(`✅ Added user: ${user.email}`);
    }

    // Seed admin user
    await database.execute(
      'INSERT INTO admins (email, password, name, role) VALUES (?, ?, ?, ?)',
      ['admin@eshop.com', hashedPassword, 'Admin User', 'admin']
    );
    console.log('✅ Added admin user');

    await database.commit();
    console.log('🎉 Database seeding completed successfully!');
    
    console.log('\n📊 Summary:');
    console.log(`📁 Categories: ${categories.length}`);
    console.log(`📦 Products: ${allProducts.length}`);
    console.log(`👥 Users: ${users.length}`);
    console.log(`🔧 Admin: 1`);
    
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