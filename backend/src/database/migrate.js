const { initializeDatabase } = require('./init');

async function migrate() {
  try {
    console.log('🗄️  Starting database migration...');
    await initializeDatabase();
    console.log('✅ Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

// Add migration for specifications and shipping columns
async function addProductSpecsAndShippingColumns(db) {
  // Add specifications column if not exists
  await db.run(`ALTER TABLE products ADD COLUMN specifications TEXT`)
    .catch(() => {}); // Ignore if already exists
  // Add shipping column if not exists
  await db.run(`ALTER TABLE products ADD COLUMN shipping TEXT`)
    .catch(() => {}); // Ignore if already exists
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate }; 
