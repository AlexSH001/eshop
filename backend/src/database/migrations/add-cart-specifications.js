// Migration script to add specifications column to cart_items table
// Run this script: node backend/src/database/migrations/add-cart-specifications.js

const { database } = require('../index');

async function addCartSpecificationsColumn() {
  try {
    console.log('🔄 Starting migration: Add specifications column to cart_items...');
    
    await database.initialize();
    
    const dbType = database.getType();
    const isPostgres = dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql';
    
    if (isPostgres) {
      // Check if column exists
      const columnCheck = await database.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'specifications'
      `);
      
      if (columnCheck.length === 0) {
        await database.execute(`ALTER TABLE cart_items ADD COLUMN specifications JSONB`);
        console.log('✅ Added specifications column to cart_items table (PostgreSQL)');
      } else {
        console.log('ℹ️ Specifications column already exists in cart_items table');
      }
    } else {
      // SQLite - try to add column
      try {
        await database.execute(`ALTER TABLE cart_items ADD COLUMN specifications TEXT`);
        console.log('✅ Added specifications column to cart_items table (SQLite)');
      } catch (error) {
        if (error.message.includes('duplicate column name')) {
          console.log('ℹ️ Specifications column already exists in cart_items table');
        } else {
          throw error;
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await database.close();
    process.exit(1);
  }
}

// Run migration if executed directly
if (require.main === module) {
  addCartSpecificationsColumn();
}

module.exports = { addCartSpecificationsColumn };

