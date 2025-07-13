const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
const imagesDir = path.join(uploadsDir, 'images');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Product data from frontend
const electronicsProducts = [
  { id: 1001, name: "Wireless Bluetooth Headphones", price: 89.99, originalPrice: 129.99, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop" },
  { id: 1002, name: "Smart Phone", price: 699.99, originalPrice: 799.99, image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop" },
  { id: 1003, name: "Laptop", price: 999.99, originalPrice: 1299.99, image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=300&fit=crop" },
  { id: 1004, name: "Smart Watch", price: 299.99, originalPrice: 399.99, image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=300&h=300&fit=crop" },
  { id: 1005, name: "Tablet", price: 449.99, originalPrice: 549.99, image: "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=300&h=300&fit=crop" },
  { id: 1006, name: "Digital Camera", price: 799.99, originalPrice: 999.99, image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=300&h=300&fit=crop" },
  { id: 1007, name: "Gaming Console", price: 499.99, originalPrice: 599.99, image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=300&h=300&fit=crop" },
  { id: 1008, name: "Bluetooth Speakers", price: 199.99, originalPrice: 299.99, image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=300&h=300&fit=crop" }
];

const fashionProducts = [
  { id: 2001, name: "Cotton T-Shirt", price: 24.99, originalPrice: 39.99, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop" },
  { id: 2002, name: "Denim Jeans", price: 79.99, originalPrice: 99.99, image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&h=300&fit=crop" },
  { id: 2003, name: "Sneakers", price: 129.99, originalPrice: 159.99, image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=300&fit=crop" },
  { id: 2004, name: "Leather Jacket", price: 199.99, originalPrice: 299.99, image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&h=300&fit=crop" },
  { id: 2005, name: "Summer Dress", price: 89.99, originalPrice: 119.99, image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=300&fit=crop" },
  { id: 2006, name: "Sunglasses", price: 49.99, originalPrice: 79.99, image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=300&fit=crop" },
  { id: 2007, name: "Winter Coat", price: 249.99, originalPrice: 349.99, image: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=300&h=300&fit=crop" },
  { id: 2008, name: "Handbag", price: 159.99, originalPrice: 199.99, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop" }
];

const homeGardenProducts = [
  { id: 3001, name: "Desk Lamp", price: 45.99, originalPrice: 69.99, image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop" },
  { id: 3002, name: "Coffee Maker", price: 159.99, originalPrice: 219.99, image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=300&fit=crop" },
  { id: 3003, name: "Plant Pot", price: 29.99, originalPrice: 39.99, image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300&h=300&fit=crop" },
  { id: 3004, name: "Throw Pillow", price: 19.99, originalPrice: 29.99, image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop" },
  { id: 3005, name: "Candle Set", price: 39.99, originalPrice: 59.99, image: "https://images.unsplash.com/photo-1602874801006-7ad421e4d2b8?w=300&h=300&fit=crop" },
  { id: 3006, name: "Wall Art", price: 89.99, originalPrice: 129.99, image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300&h=300&fit=crop" },
  { id: 3007, name: "Garden Tools", price: 79.99, originalPrice: 99.99, image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&h=300&fit=crop" },
  { id: 3008, name: "Storage Box", price: 49.99, originalPrice: 69.99, image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=300&fit=crop" }
];

const gamingProducts = [
  { id: 4009, name: "Mechanical Keyboard", price: 129.99, originalPrice: 179.99, image: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=300&h=300&fit=crop" },
  { id: 4000, name: "Gaming Mouse", price: 79.99, originalPrice: 99.99, image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=300&h=300&fit=crop" },
  { id: 4001, name: "Gaming Headset", price: 149.99, originalPrice: 199.99, image: "https://images.unsplash.com/photo-1612198537235-1f85bde9ac07?w=300&h=300&fit=crop" },
  { id: 4002, name: "Controller", price: 59.99, originalPrice: 79.99, image: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=300&h=300&fit=crop" },
  { id: 4003, name: "Gaming Chair", price: 299.99, originalPrice: 399.99, image: "https://images.unsplash.com/photo-1592300556311-8fc8ac6d0ddc?w=300&h=300&fit=crop" },
  { id: 4004, name: "Gaming Monitor", price: 399.99, originalPrice: 499.99, image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300&h=300&fit=crop" },
  { id: 4005, name: "Gaming Desk", price: 249.99, originalPrice: 329.99, image: "https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=300&h=300&fit=crop" },
  { id: 4006, name: "RGB Lighting", price: 89.99, originalPrice: 119.99, image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=300&fit=crop" }
];

const sportsProducts = [
  { id: 5007, name: "Running Shoes", price: 89.99, originalPrice: 129.99, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop" },
  { id: 5008, name: "Yoga Mat", price: 29.99, originalPrice: 49.99, image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300&h=300&fit=crop" },
  { id: 5009, name: "Dumbbells Set", price: 79.99, originalPrice: 99.99, image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop" },
  { id: 5000, name: "Sports Water Bottle", price: 19.99, originalPrice: 29.99, image: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=300&h=300&fit=crop" },
  { id: 5001, name: "Fitness Tracker", price: 149.99, originalPrice: 199.99, image: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=300&h=300&fit=crop" },
  { id: 5002, name: "Tennis Racket", price: 99.99, originalPrice: 149.99, image: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=300&h=300&fit=crop" }
];

// Category data from frontend
const allCategories = [
  {
    name: "Electronics",
    icon: "Smartphone",
    description: "Phones, Laptops, Gadgets",
    href: "/categories/electronics",
    productCount: 12,
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop"
  },
  {
    name: "Fashion",
    icon: "ShoppingBag",
    description: "Clothing, Shoes, Accessories",
    href: "/categories/fashion",
    productCount: 8,
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop"
  },
  {
    name: "Home & Garden",
    icon: "HomeIcon",
    description: "Furniture, Decor, Tools",
    href: "/categories/home-garden",
    productCount: 8,
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop"
  },
  {
    name: "Gaming",
    icon: "Gamepad2",
    description: "Consoles, Games, Accessories",
    href: "/categories/gaming",
    productCount: 8,
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&h=300&fit=crop"
  },
  {
    name: "Sports",
    icon: "Dumbbell",
    description: "Fitness, Camping, Sports",
    href: "/categories/sports",
    productCount: 6,
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop"
  },
  {
    name: "Photography",
    icon: "Camera",
    description: "Cameras, Lenses, Equipment",
    href: "/categories/photography",
    productCount: 5,
    image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop"
  },
  {
    name: "Books",
    icon: "Book",
    description: "Books, Movies, Music",
    href: "/categories/books",
    productCount: 4,
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop"
  },
  {
    name: "Automotive",
    icon: "Car",
    description: "Parts, Accessories, Tools",
    href: "/categories/automotive",
    productCount: 6,
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop"
  },
  {
    name: "Music",
    icon: "Music",
    description: "Instruments, Audio, Equipment",
    href: "/categories/music",
    productCount: 5,
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop"
  },
  {
    name: "Baby & Kids",
    icon: "Baby",
    description: "Toys, Clothes, Safety",
    href: "/categories/baby-kids",
    productCount: 7,
    image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=300&fit=crop"
  }
];

// Banner slides data
const bannerSlides = [
  {
    id: 1,
    title: "Summer Sale",
    subtitle: "Up to 70% off on all electronics",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=400&fit=crop",
    cta: "Shop Electronics",
    link: "/categories/electronics"
  },
  {
    id: 2,
    title: "New Fashion Collection",
    subtitle: "Discover the latest trends",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop",
    cta: "Shop Fashion",
    link: "/categories/fashion"
  },
  {
    id: 3,
    title: "Home & Garden Sale",
    subtitle: "Transform your living space",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&h=400&fit=crop",
    cta: "Shop Home",
    link: "/categories/home-garden"
  },
  {
    id: 4,
    title: "Gaming Gear",
    subtitle: "Level up your gaming experience",
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=1200&h=400&fit=crop",
    cta: "Shop Gaming",
    link: "/categories/gaming"
  }
];

// Function to download image
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }

      const filePath = path.join(imagesDir, filename);
      const fileStream = fs.createWriteStream(filePath);
      
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`✅ Downloaded: ${filename}`);
        resolve(filePath);
      });
      
      fileStream.on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete the file if there was an error
        reject(err);
      });
    }).on('error', reject);
  });
}

// Function to extract filename from URL
function getFilenameFromUrl(url, prefix = '') {
  const urlParts = url.split('?')[0].split('/');
  const originalName = urlParts[urlParts.length - 1];
  const extension = originalName.includes('.') ? originalName.split('.').pop() : 'jpg';
  const name = originalName.split('.')[0] || 'image';
  return `${prefix}${name}.${extension}`;
}

// Main function to download all images
async function downloadAllImages() {
  console.log('🖼️  Starting image download...');
  
  const allImages = [];
  
  // Collect all product images
  const allProducts = [
    ...electronicsProducts,
    ...fashionProducts,
    ...homeGardenProducts,
    ...gamingProducts,
    ...sportsProducts
  ];
  
  // Add product images
  allProducts.forEach(product => {
    allImages.push({
      url: product.image,
      filename: `product_${product.id}.jpg`,
      type: 'product'
    });
  });
  
  // Add category images
  allCategories.forEach(category => {
    allImages.push({
      url: category.image,
      filename: `category_${category.name.toLowerCase().replace(/\s+/g, '_')}.jpg`,
      type: 'category'
    });
  });
  
  // Add banner images
  bannerSlides.forEach(banner => {
    allImages.push({
      url: banner.image,
      filename: `banner_${banner.id}.jpg`,
      type: 'banner'
    });
  });
  
  console.log(`📊 Found ${allImages.length} images to download`);
  
  // Download images with concurrency limit
  const concurrencyLimit = 5;
  const chunks = [];
  for (let i = 0; i < allImages.length; i += concurrencyLimit) {
    chunks.push(allImages.slice(i, i + concurrencyLimit));
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`📦 Downloading chunk ${i + 1}/${chunks.length} (${chunk.length} images)`);
    
    const promises = chunk.map(async (image) => {
      try {
        await downloadImage(image.url, image.filename);
        successCount++;
        return { success: true, filename: image.filename };
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to download ${image.filename}: ${error.message}`);
        return { success: false, filename: image.filename, error: error.message };
      }
    });
    
    await Promise.all(promises);
    
    // Small delay between chunks to be respectful to the server
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n📈 Download Summary:`);
  console.log(`✅ Successfully downloaded: ${successCount} images`);
  console.log(`❌ Failed downloads: ${errorCount} images`);
  console.log(`📁 Images saved to: ${imagesDir}`);
  
  // Create a mapping file for reference
  const imageMapping = {
    products: allProducts.map(p => ({
      id: p.id,
      name: p.name,
      originalUrl: p.image,
      localPath: `/uploads/images/product_${p.id}.jpg`
    })),
    categories: allCategories.map(c => ({
      name: c.name,
      originalUrl: c.image,
      localPath: `/uploads/images/category_${c.name.toLowerCase().replace(/\s+/g, '_')}.jpg`
    })),
    banners: bannerSlides.map(b => ({
      id: b.id,
      title: b.title,
      originalUrl: b.image,
      localPath: `/uploads/images/banner_${b.id}.jpg`
    }))
  };
  
  fs.writeFileSync(
    path.join(uploadsDir, 'image-mapping.json'),
    JSON.stringify(imageMapping, null, 2)
  );
  
  console.log(`📄 Image mapping saved to: ${path.join(uploadsDir, 'image-mapping.json')}`);
}

// Run the download
if (require.main === module) {
  downloadAllImages().catch(console.error);
}

module.exports = { downloadAllImages }; 