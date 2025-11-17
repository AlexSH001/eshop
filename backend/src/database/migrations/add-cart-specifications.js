// Migration script to add specifications column to cart_items table and remove UNIQUE constraints
// Run this script: node backend/src/database/migrations/add-cart-specifications.js

const { database } = require('../index');

async function addCartSpecificationsColumn() {
  try {
    console.log('🔄 Starting migration: Add specifications column and remove UNIQUE constraints from cart_items...');
    
    await database.initialize();
    
    const dbType = database.getType();
    const isPostgres = dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql';
    
    // Step 1: Add specifications column
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
    
    // Step 2: Remove UNIQUE constraints to allow same product with different specifications
    if (isPostgres) {
      // Check and drop UNIQUE constraints
      const constraints = await database.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'cart_items' 
        AND constraint_type = 'UNIQUE'
        AND (constraint_name LIKE '%user_id%product_id%' OR constraint_name LIKE '%session_id%product_id%')
      `);
      
      for (const constraint of constraints) {
        try {
          await database.execute(`ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS ${constraint.constraint_name}`);
          console.log(`✅ Dropped UNIQUE constraint: ${constraint.constraint_name}`);
        } catch (error) {
          console.warn(`⚠️ Could not drop constraint ${constraint.constraint_name}:`, error.message);
        }
      }
      
      // Also try common constraint names
      const commonNames = [
        'cart_items_user_id_product_id_key',
        'cart_items_session_id_product_id_key',
        'cart_items_user_id_product_id_unique',
        'cart_items_session_id_product_id_unique'
      ];
      
      for (const name of commonNames) {
        try {
          await database.execute(`ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS ${name}`);
          console.log(`✅ Dropped UNIQUE constraint: ${name}`);
        } catch (error) {
          // Ignore if constraint doesn't exist
        }
      }
    } else {
      // SQLite doesn't support DROP CONSTRAINT directly
      // The application code will handle duplicate checking based on specifications
      console.log('ℹ️ SQLite: UNIQUE constraints need to be removed manually if needed');
      console.log('   The application will handle duplicate checking based on specifications');
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

