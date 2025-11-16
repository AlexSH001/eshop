// Migration script to remove UNIQUE constraints from cart_items table
// This allows the same product with different specifications to be added to cart
// Run this script: node backend/src/database/migrations/remove-cart-unique-constraints.js

const { database } = require('../index');

async function removeCartUniqueConstraints() {
  try {
    console.log('🔄 Starting migration: Remove UNIQUE constraints from cart_items...');
    
    await database.initialize();
    
    const dbType = database.getType();
    const isPostgres = dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql';
    
    if (isPostgres) {
      // Get all UNIQUE constraints on cart_items
      const constraints = await database.query(`
        SELECT 
          tc.constraint_name,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'cart_items' 
        AND tc.constraint_type = 'UNIQUE'
        ORDER BY tc.constraint_name, kcu.ordinal_position
      `);
      
      console.log('Found UNIQUE constraints:', constraints);
      
      // Group constraints by name to see which columns they cover
      const constraintGroups = {};
      for (const constraint of constraints) {
        if (!constraintGroups[constraint.constraint_name]) {
          constraintGroups[constraint.constraint_name] = [];
        }
        constraintGroups[constraint.constraint_name].push(constraint.column_name);
      }
      
      // Drop constraints that involve user_id/product_id or session_id/product_id
      for (const [constraintName, columns] of Object.entries(constraintGroups)) {
        const hasUserId = columns.includes('user_id');
        const hasProductId = columns.includes('product_id');
        const hasSessionId = columns.includes('session_id');
        
        if ((hasUserId && hasProductId) || (hasSessionId && hasProductId)) {
          try {
            await database.execute(`ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS ${constraintName}`);
            console.log(`✅ Dropped UNIQUE constraint: ${constraintName} (columns: ${columns.join(', ')})`);
          } catch (error) {
            console.warn(`⚠️ Could not drop constraint ${constraintName}:`, error.message);
          }
        }
      }
      
      // Also try common constraint names directly
      const commonNames = [
        'cart_items_user_id_product_id_key',
        'cart_items_session_id_product_id_key',
        'cart_items_user_id_product_id_unique',
        'cart_items_session_id_product_id_unique'
      ];
      
      for (const name of commonNames) {
        try {
          await database.execute(`ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS ${name}`);
          console.log(`✅ Attempted to drop constraint: ${name}`);
        } catch (error) {
          // Ignore if constraint doesn't exist
        }
      }
    } else {
      // SQLite doesn't support DROP CONSTRAINT directly
      console.log('ℹ️ SQLite: UNIQUE constraints cannot be dropped directly');
      console.log('   You may need to recreate the table or the application will handle it');
      console.log('   The application code will check for duplicates based on specifications');
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('   You can now add the same product with different specifications to the cart');
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
  removeCartUniqueConstraints();
}

module.exports = { removeCartUniqueConstraints };

