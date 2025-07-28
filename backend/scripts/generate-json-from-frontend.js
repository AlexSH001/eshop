#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Paths
const frontendDataPath = path.join(__dirname, '../../frontend/src/data');
const backendDataPath = path.join(__dirname, '../data');

// Ensure backend data directory exists
if (!fs.existsSync(backendDataPath)) {
  fs.mkdirSync(backendDataPath, { recursive: true });
}

// Read frontend categories.ts and extract data
function extractCategoriesData() {
  const categoriesPath = path.join(frontendDataPath, 'categories.ts');
  const categoriesContent = fs.readFileSync(categoriesPath, 'utf8');
  
  // Extract allCategories array using regex
  const allCategoriesMatch = categoriesContent.match(/export const allCategories = (\[[\s\S]*?\]);/);
  const bannerSlidesMatch = categoriesContent.match(/export const bannerSlides = (\[[\s\S]*?\]);/);
  
  if (!allCategoriesMatch || !bannerSlidesMatch) {
    throw new Error('Could not extract categories data from frontend file');
  }
  
  // Convert icon references to strings before parsing
  let categoriesStr = allCategoriesMatch[1]
    .replace(/icon: \w+/g, (match) => {
      const iconName = match.split(': ')[1];
      return `icon: "${iconName.toLowerCase()}"`;
    });
  
  let bannersStr = bannerSlidesMatch[1];
  
  // Use eval to safely parse the JavaScript object (since we control the source)
  const categories = eval('(' + categoriesStr + ')');
  const banners = eval('(' + bannersStr + ')');
  
  // Transform categories to backend format
  const backendCategories = categories.map((cat, index) => ({
    id: index + 1,
    name: cat.name,
    slug: cat.href.replace('/categories/', ''),
    description: cat.description,
    icon: cat.icon,
    image: cat.image,
    sort_order: index,
    is_active: true
  }));
  
  return {
    categories: backendCategories,
    banners: banners
  };
}

// Read frontend products.ts and extract data
function extractProductsData() {
  const productsPath = path.join(frontendDataPath, 'products.ts');
  const productsContent = fs.readFileSync(productsPath, 'utf8');
  
  // Extract all product arrays using regex
  const productArrays = [
    'electronicsProducts',
    'fashionProducts', 
    'homeGardenProducts',
    'gamingProducts',
    'sportsProducts'
  ];
  
  const allProducts = [];
  let categoryId = 1;
  
  productArrays.forEach(arrayName => {
    const regex = new RegExp(`export const ${arrayName} = (\\[[\\s\\S]*?\\]);`);
    const match = productsContent.match(regex);
    
    if (match) {
      // Use eval to safely parse the JavaScript object (since we control the source)
      const products = eval('(' + match[1] + ')');
      
      // Transform to backend format
      const backendProducts = products.map(product => ({
        id: product.id,
        name: product.name,
        categoryid: categoryId,
        price: product.price,
        originalprice: product.originalprice,
        stock: 99,
        images: [
          {
            image: `/uploads/products/${product.id}/1.jpg`,
            download_link: product.image
          }
        ],
        description: "",
        specifications: [
          { key: "", value: "" }
        ],
        shipping: ""
      }));
      
      allProducts.push(...backendProducts);
      categoryId++;
    }
  });
  
  return allProducts;
}

// Generate the JSON files
function generateJsonFiles() {
  try {
    console.log('🔄 Generating JSON files from frontend data...');
    
    // Generate categories.json
    const categoriesData = extractCategoriesData();
    const categoriesJsonPath = path.join(backendDataPath, 'categories.json');
    fs.writeFileSync(categoriesJsonPath, JSON.stringify(categoriesData, null, 2));
    console.log('✅ Generated categories.json');
    
    // Generate products.json
    const productsData = extractProductsData();
    const productsJsonPath = path.join(backendDataPath, 'products.json');
    fs.writeFileSync(productsJsonPath, JSON.stringify({ products: productsData }, null, 2));
    console.log('✅ Generated products.json');
    
    console.log(`📊 Generated ${categoriesData.categories.length} categories and ${productsData.length} products`);
    console.log('🎉 JSON generation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error generating JSON files:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  generateJsonFiles();
}

module.exports = { generateJsonFiles, extractCategoriesData, extractProductsData }; 