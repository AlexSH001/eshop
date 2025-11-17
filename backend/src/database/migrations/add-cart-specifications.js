// Migration script to add specifications column to cart_items table and remove UNIQUE constraints
// 
// Run this script:
//   - In Docker Compose: docker-compose exec backend node src/database/migrations/add-cart-specifications.js
//   - Standalone: node backend/src/database/migrations/add-cart-specifications.js
//   - With env vars: DB_HOST=your_host DB_USER=user DB_PASSWORD=pass DB_NAME=dbname node src/database/migrations/add-cart-specifications.js

require('dotenv').config();
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
      // First, get ALL UNIQUE constraints on cart_items table
      const allConstraints = await database.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'cart_items' 
        AND constraint_type = 'UNIQUE'
      `);
      
      console.log(`Found ${allConstraints.length} UNIQUE constraint(s) on cart_items table`);
      
      // Get constraint columns to identify which ones involve user_id/product_id or session_id/product_id
      for (const constraint of allConstraints) {
        const constraintName = constraint.constraint_name || constraint.constraintName;
        if (!constraintName) {
          console.warn('⚠️ Skipping constraint with no name:', constraint);
          continue;
        }
        
        const constraintColumns = await database.query(`
          SELECT column_name
          FROM information_schema.key_column_usage
          WHERE constraint_name = $1
          AND table_name = 'cart_items'
          ORDER BY ordinal_position
        `, [constraintName]);
        
        const columns = constraintColumns.map(c => c.column_name || c.columnName);
        const hasUserId = columns.includes('user_id');
        const hasProductId = columns.includes('product_id');
        const hasSessionId = columns.includes('session_id');
        
        // Drop constraints that involve (user_id, product_id) or (session_id, product_id)
        if ((hasUserId && hasProductId) || (hasSessionId && hasProductId)) {
          try {
            await database.execute(`ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS ${constraintName}`);
            console.log(`✅ Dropped UNIQUE constraint: ${constraintName} (columns: ${columns.join(', ')})`);
          } catch (error) {
            console.warn(`⚠️ Could not drop constraint ${constraintName}:`, error.message);
          }
        } else {
          console.log(`ℹ️ Skipping constraint ${constraintName} (columns: ${columns.join(', ')}) - not related to product_id`);
        }
      }
      
      // Also try common constraint names as fallback
      const commonNames = [
        'cart_items_user_id_product_id_key',
        'cart_items_session_id_product_id_key',
        'cart_items_user_id_product_id_unique',
        'cart_items_session_id_product_id_unique',
        'cart_items_pkey' // Primary key, but check anyway
      ];
      
      for (const name of commonNames) {
        try {
          // Skip primary key constraint
          if (name === 'cart_items_pkey') continue;
          
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

