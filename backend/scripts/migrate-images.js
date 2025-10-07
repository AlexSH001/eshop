const fs = require('fs');
const path = require('path');

// Category mapping from database
const categories = {
  1: { name: 'Electronics', slug: 'electronics', folder: 'electronics' },
  2: { name: 'Fashion', slug: 'fashion', folder: 'fashion' },
  3: { name: 'Home & Garden', slug: 'home-garden', folder: 'home-&-garden' },
  4: { name: 'Gaming', slug: 'gaming', folder: 'gaming' },
  5: { name: 'Sports', slug: 'sports', folder: 'sports' },
  6: { name: 'Photography', slug: 'photography', folder: 'photography' },
  7: { name: 'Books', slug: 'books', folder: 'books' },
  8: { name: 'Automotive', slug: 'automotive', folder: 'automotive' },
  9: { name: 'Music', slug: 'music', folder: 'music' },
  10: { name: 'Baby & Kids', slug: 'baby-kids', folder: 'baby-&-kids' }
};

// Products data from the JSON file
const products = [
  { id: 1001, name: 'Wireless Bluetooth Headphones', categoryid: 1 },
  { id: 1002, name: 'Smart Phone', categoryid: 1 },
  { id: 1003, name: 'Laptop', categoryid: 1 },
  { id: 1004, name: 'Smart Watch', categoryid: 1 },
  { id: 1005, name: 'Tablet', categoryid: 1 },
  { id: 1006, name: 'Digital Camera', categoryid: 1 },
  { id: 1007, name: 'Gaming Console', categoryid: 1 },
  { id: 1008, name: 'Bluetooth Speakers', categoryid: 1 },
  { id: 2001, name: 'Cotton T-Shirt', categoryid: 2 },
  { id: 2002, name: 'Denim Jeans', categoryid: 2 },
  { id: 2003, name: 'Sneakers', categoryid: 2 },
  { id: 2004, name: 'Leather Jacket', categoryid: 2 },
  { id: 2005, name: 'Summer Dress', categoryid: 2 },
  { id: 2006, name: 'Sunglasses', categoryid: 2 },
  { id: 2007, name: 'Winter Coat', categoryid: 2 },
  { id: 2008, name: 'Handbag', categoryid: 2 },
  { id: 3001, name: 'Desk Lamp', categoryid: 3 },
  { id: 3002, name: 'Coffee Maker', categoryid: 3 },
  { id: 3003, name: 'Plant Pot', categoryid: 3 },
  { id: 3004, name: 'Throw Pillow', categoryid: 3 },
  { id: 3006, name: 'Wall Art', categoryid: 3 },
  { id: 3007, name: 'Garden Tools', categoryid: 3 },
  { id: 4009, name: 'Mechanical Keyboard', categoryid: 4 },
  { id: 4000, name: 'Gaming Mouse', categoryid: 4 },
  { id: 4002, name: 'Controller', categoryid: 4 },
  { id: 4004, name: 'Gaming Monitor', categoryid: 4 },
  { id: 4005, name: 'Gaming Desk', categoryid: 4 },
  { id: 5007, name: 'Running Shoes', categoryid: 5 },
  { id: 5008, name: 'Yoga Mat', categoryid: 5 },
  { id: 5009, name: 'Dumbbells Set', categoryid: 5 },
  { id: 5000, name: 'Sports Water Bottle', categoryid: 5 },
  { id: 5001, name: 'Fitness Tracker', categoryid: 5 },
  { id: 5002, name: 'Tennis Racket', categoryid: 5 }
];

// Helper function to generate random 5-digit number
function generateRandomNumber() {
  return Math.floor(Math.random() * 90000) + 10000;
}

// Helper function to format product name for filename
function formatProductName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Helper function to get current date in YYYYMMDD format
function getCurrentDate() {
  const now = new Date();
  return now.getFullYear().toString() + 
         (now.getMonth() + 1).toString().padStart(2, '0') + 
         now.getDate().toString().padStart(2, '0');
}

// Main migration function
async function migrateImages() {
  const frontendImagesPath = path.join(__dirname, '../../frontend/static/images/products');
  const backendUploadsPath = path.join(__dirname, '../uploads/products');
  
  console.log('Starting image migration...');
  console.log('Frontend images path:', frontendImagesPath);
  console.log('Backend uploads path:', backendUploadsPath);
  
  // Check if frontend images directory exists
  if (!fs.existsSync(frontendImagesPath)) {
    console.error('Frontend images directory does not exist:', frontendImagesPath);
    return;
  }
  
  // Check if backend uploads directory exists
  if (!fs.existsSync(backendUploadsPath)) {
    console.error('Backend uploads directory does not exist:', backendUploadsPath);
    return;
  }
  
  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  // Process each product
  for (const product of products) {
    const sourceFileName = `product_${product.id}.jpg`;
    const sourcePath = path.join(frontendImagesPath, sourceFileName);
    
    // Check if source image exists
    if (!fs.existsSync(sourcePath)) {
      console.log(`⚠️  Source image not found: ${sourceFileName}`);
      skippedCount++;
      continue;
    }
    
    // Get category information
    const category = categories[product.categoryid];
    if (!category) {
      console.error(`❌ Category not found for product ${product.id} (categoryid: ${product.categoryid})`);
      errorCount++;
      continue;
    }
    
    // Create destination directory if it doesn't exist
    const categoryFolder = path.join(backendUploadsPath, category.folder);
    if (!fs.existsSync(categoryFolder)) {
      fs.mkdirSync(categoryFolder, { recursive: true });
      console.log(`📁 Created category folder: ${category.folder}`);
    }
    
    // Generate new filename
    const formattedName = formatProductName(product.name);
    const currentDate = getCurrentDate();
    const randomNumber = generateRandomNumber();
    const fileExtension = path.extname(sourceFileName);
    const newFileName = `${formattedName}-${currentDate}-${randomNumber}${fileExtension}`;
    const destinationPath = path.join(categoryFolder, newFileName);
    
    try {
      // Copy the file to the new location
      fs.copyFileSync(sourcePath, destinationPath);
      console.log(`✅ Migrated: ${sourceFileName} → ${category.folder}/${newFileName}`);
      migratedCount++;
    } catch (error) {
      console.error(`❌ Error migrating ${sourceFileName}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n📊 Migration Summary:');
  console.log(`✅ Successfully migrated: ${migratedCount} images`);
  console.log(`⚠️  Skipped (not found): ${skippedCount} images`);
  console.log(`❌ Errors: ${errorCount} images`);
  console.log(`📁 Total processed: ${migratedCount + skippedCount + errorCount} images`);
}

// Run the migration
if (require.main === module) {
  migrateImages().catch(console.error);
}

module.exports = { migrateImages };
