const { initializeDatabase, database } = require('./init');

async function migrate() {
  try {
    console.log('🗄️  Starting database migration...');
    await initializeDatabase();
    
    // Run additional migrations for existing databases
    await addProductSpecsAndShippingColumns(database);
    
    console.log('✅ Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

// Add migration for specifications and shipping columns
async function addProductSpecsAndShippingColumns(db) {
  try {
    // Add specifications column if not exists
    await db.execute(`ALTER TABLE products ADD COLUMN specifications TEXT`);
    console.log('✅ Added specifications column to products table');
  } catch (error) {
    // Ignore if already exists
    if (!error.message.includes('duplicate column name')) {
      console.log('⚠️ Specifications column already exists or error:', error.message);
    }
  }
  
  try {
    // Add shipping column if not exists
    await db.execute(`ALTER TABLE products ADD COLUMN shipping TEXT`);
    console.log('✅ Added shipping column to products table');
  } catch (error) {
    // Ignore if already exists
    if (!error.message.includes('duplicate column name')) {
      console.log('⚠️ Shipping column already exists or error:', error.message);
    }
  }
  
  try {
    // Add href column if not exists
    await db.execute(`ALTER TABLE categories ADD COLUMN href TEXT`);
    console.log('✅ Added href column to categories table');
  } catch (error) {
    // Ignore if already exists
    if (!error.message.includes('duplicate column name')) {
      console.log('⚠️ Href column already exists or error:', error.message);
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate }; 
