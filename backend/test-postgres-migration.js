const { postgresDatabase } = require('./src/database/init-postgres');
const { performFullMigration } = require('./src/database/migrate-full');

async function testPostgresMigration() {
  console.log('🧪 Testing PostgreSQL migration...');
  
  // Define test data constants
  const testCategory = {
    name: 'Test Category',
    slug: 'test-category',
    description: 'Test category for migration test',
    is_active: true
  };
  
  try {
    // Clean up any existing test data first
    console.log('\n🧹 Cleaning up any existing test data...');
    const catRows = await postgresDatabase.query('SELECT id FROM categories WHERE slug = $1 OR name = $2', [testCategory.slug, testCategory.name]);
    if (catRows.length > 0) {
      const catIds = catRows.map(row => row.id);
      console.log('🪪 Found existing test category IDs for cleanup:', catIds);
      const placeholders = catIds.map((_, i) => `$${i + 1}`).join(', ');
      // Delete all products referencing any of these category ids
      await postgresDatabase.execute(`DELETE FROM products WHERE category_id IN (${placeholders})`, catIds);
      // Delete all those categories
      await postgresDatabase.execute(`DELETE FROM categories WHERE id IN (${placeholders})`, catIds);
      console.log('✅ Existing test data cleaned up');
    }
    
    // Clean up any existing transaction test category
    await postgresDatabase.execute(
      'DELETE FROM categories WHERE slug = $1 OR name = $2 OR name = $3',
      ['transaction-test-category', 'Transaction Test Category', 'Updated Transaction Test Category']
    );
    console.log('✅ Transaction test data cleaned up');
    
    // Test 1: Database connection
    console.log('\n📡 Test 1: Database connection...');
    await postgresDatabase.connect();
    console.log('✅ Database connection successful');
    
    // Test 2: Schema initialization (skip if already exists)
    console.log('\n📋 Test 2: Schema initialization...');
    try {
      await postgresDatabase.initializeSchema();
      console.log('✅ Schema initialization successful');
    } catch (error) {
      if (error.code === '42710') {
        console.log('✅ Schema already exists, skipping initialization');
      } else {
        throw error;
      }
    }
    
    // Test 3: Health check
    console.log('\n🏥 Test 3: Health check...');
    const health = await postgresDatabase.healthCheck();
    console.log('Health status:', health);
    if (health.status === 'healthy') {
      console.log('✅ Health check passed');
    } else {
      throw new Error('Health check failed');
    }
    
    // Test 4: Basic queries
    console.log('\n🔍 Test 4: Basic queries...');
    
    // Test users table
    const userCount = await postgresDatabase.query('SELECT COUNT(*) as count FROM users');
    console.log('Users count:', userCount[0].count);
    
    // Test products table
    const productCount = await postgresDatabase.query('SELECT COUNT(*) as count FROM products');
    console.log('Products count:', productCount[0].count);
    
    // Test categories table
    const categoryCount = await postgresDatabase.query('SELECT COUNT(*) as count FROM categories');
    console.log('Categories count:', categoryCount[0].count);
    
    console.log('✅ Basic queries successful');
    
    // Test 5: JSONB functionality
    console.log('\n📄 Test 5: JSONB functionality...');
    
    // Clean up any existing test category before inserting
    await postgresDatabase.execute('DELETE FROM categories WHERE slug = $1 OR name = $2', [testCategory.slug, testCategory.name]);

    // Insert a test category for the product's foreign key
    const insertCategoryResult = await postgresDatabase.execute(
      `INSERT INTO categories (name, slug, description, is_active) VALUES ($1, $2, $3, $4) RETURNING id`,
      [testCategory.name, testCategory.slug, testCategory.description, testCategory.is_active]
    );
    const testCategoryId = insertCategoryResult.rows[0].id;
    console.log('Inserted test category with ID:', testCategoryId);

    // Insert test product with JSONB data
    const testProduct = {
      name: 'Test Product',
      slug: 'test-product',
      description: 'Test product description',
      price: 99.99,
      category_id: testCategoryId,
      dimensions: JSON.stringify({ length: 10, width: 5, height: 2 }),
      images: JSON.stringify(['image1.jpg', 'image2.jpg']),
      tags: JSON.stringify(['test', 'migration']),
      attributes: JSON.stringify({ color: 'red', size: 'medium' })
    };
    
    const insertResult = await postgresDatabase.execute(`
      INSERT INTO products (name, slug, description, price, category_id, dimensions, images, tags, attributes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      testProduct.name, testProduct.slug, testProduct.description, testProduct.price,
      testProduct.category_id, testProduct.dimensions, testProduct.images,
      testProduct.tags, testProduct.attributes
    ]);
    
    console.log('Inserted test product with ID:', insertResult.rows[0].id);
    
    // Query JSONB data
    const jsonbTest = await postgresDatabase.query(`
      SELECT name, dimensions, images, tags, attributes 
      FROM products 
      WHERE slug = $1
    `, [testProduct.slug]);
    
    if (jsonbTest.length > 0) {
      const product = jsonbTest[0];
      console.log('JSONB data retrieved successfully:');
      console.log('- Dimensions:', product.dimensions);
      console.log('- Images:', product.images);
      console.log('- Tags:', product.tags);
      console.log('- Attributes:', product.attributes);
      console.log('✅ JSONB functionality working');
    } else {
      throw new Error('JSONB test failed');
    }
    
    // Test 6: Transaction handling
    console.log('\n💾 Test 6: Transaction handling...');
    const client = await postgresDatabase.beginTransaction();
    
    try {
      await client.query('INSERT INTO categories (name, slug) VALUES ($1, $2)', ['Transaction Test Category', 'transaction-test-category']);
      await client.query('UPDATE categories SET name = $1 WHERE slug = $2', ['Updated Transaction Test Category', 'transaction-test-category']);
      await postgresDatabase.commit(client);
      console.log('✅ Transaction committed successfully');
    } catch (error) {
      await postgresDatabase.rollback(client);
      console.log('✅ Transaction rollback successful');
      throw error;
    }
    
    // Test 7: Database statistics
    console.log('\n📊 Test 7: Database statistics...');
    const stats = await postgresDatabase.getStats();
    console.log('Database stats:', stats);
    console.log('✅ Statistics retrieved successfully');
    
    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    // Get all test category ids
    const cleanupCatRows = await postgresDatabase.query('SELECT id FROM categories WHERE slug = $1 OR name = $2', [testCategory.slug, testCategory.name]);
    if (cleanupCatRows.length > 0) {
      const catIds = cleanupCatRows.map(row => row.id);
      console.log('🪪 Test category IDs for cleanup:', catIds);
      const placeholders = catIds.map((_, i) => `$${i + 1}`).join(', ');
      // Delete all products referencing any of these category ids
      await postgresDatabase.execute(`DELETE FROM products WHERE category_id IN (${placeholders})`, catIds);
      // Delete all those categories
      await postgresDatabase.execute(`DELETE FROM categories WHERE id IN (${placeholders})`, catIds);
    }
    
    // Also clean up transaction test category
    await postgresDatabase.execute(
      'DELETE FROM categories WHERE slug = $1 OR name = $2 OR name = $3',
      ['transaction-test-category', 'Transaction Test Category', 'Updated Transaction Test Category']
    );
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 All PostgreSQL migration tests passed!');
    console.log('✅ PostgreSQL is ready for production use');
    
  } catch (error) {
    console.error('\n❌ PostgreSQL migration test failed:', error);
    throw error;
  } finally {
    // Close database connection
    await postgresDatabase.close();
  }
}

// Run tests if called directly
if (require.main === module) {
  testPostgresMigration()
    .then(() => {
      console.log('\n🎉 PostgreSQL migration test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 PostgreSQL migration test failed:', error);
      process.exit(1);
    });
}

module.exports = { testPostgresMigration }; 