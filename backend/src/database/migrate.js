// Database detection and initialization
let database;
let isPostgres = false;

async function initializeDatabase() {
  // Check if PostgreSQL is configured
  const dbClient = process.env.DB_CLIENT || 'sqlite';
  
  if (dbClient === 'postgres' || process.env.DB_HOST) {
    try {
      const { postgresDatabase } = require('./init-postgres');
      database = postgresDatabase;
      isPostgres = true;
      console.log('🔄 Using PostgreSQL database for migration');
    } catch (error) {
      console.log('⚠️ PostgreSQL not available, falling back to SQLite');
      const { database: sqliteDatabase } = require('./init');
      database = sqliteDatabase;
      isPostgres = false;
    }
  } else {
    const { database: sqliteDatabase } = require('./init');
    database = sqliteDatabase;
    isPostgres = false;
    console.log('🔄 Using SQLite database for migration');
  }

  await database.connect();
  await database.initializeSchema();
}

async function migrate() {
  try {
    console.log('🗄️  Starting database migration...');
    await initializeDatabase();
    
    // Run additional migrations for existing databases
    // For SQLite, add columns that might be missing
    // For PostgreSQL, check and add if needed
    if (!isPostgres) {
      await addProductSpecsAndShippingColumns(database);
    } else {
      // For PostgreSQL, still check and add cart_items.specifications if missing
      await addCartSpecificationsColumn(database);
      console.log('ℹ️  PostgreSQL schema migration completed');
    }
    
    console.log('✅ Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

// Add migration for specifications and shipping columns (SQLite only)
async function addProductSpecsAndShippingColumns(db) {
  try {
    // Add specifications column if not exists
    await db.execute(`ALTER TABLE products ADD COLUMN specifications TEXT`);
    console.log('✅ Added specifications column to products table');
  } catch (error) {
    // Ignore if already exists
    if (!error.message.includes('duplicate column name') && !error.message.includes('already exists')) {
      console.log('⚠️ Specifications column already exists or error:', error.message);
    }
  }
  
  try {
    // Add shipping column if not exists
    await db.execute(`ALTER TABLE products ADD COLUMN shipping TEXT`);
    console.log('✅ Added shipping column to products table');
  } catch (error) {
    // Ignore if already exists
    if (!error.message.includes('duplicate column name') && !error.message.includes('already exists')) {
      console.log('⚠️ Shipping column already exists or error:', error.message);
    }
  }
  
  try {
    // Add href column if not exists
    await db.execute(`ALTER TABLE categories ADD COLUMN href TEXT`);
    console.log('✅ Added href column to categories table');
  } catch (error) {
    // Ignore if already exists
    if (!error.message.includes('duplicate column name') && !error.message.includes('already exists')) {
      console.log('⚠️ Href column already exists or error:', error.message);
    }
  }
  
  // Add specifications column to cart_items table
  await addCartSpecificationsColumn(db);
}

// Add specifications column to cart_items table
async function addCartSpecificationsColumn(db) {
  const dbType = db.getType ? db.getType() : (process.env.DB_CLIENT || 'sqlite3');
  const isPostgres = dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql';
  
  try {
    if (isPostgres) {
      // Check if column exists first
      const columnCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'specifications'
      `);
      
      if (columnCheck.length === 0) {
        await db.execute(`ALTER TABLE cart_items ADD COLUMN specifications JSONB`);
        console.log('✅ Added specifications column to cart_items table (PostgreSQL)');
      } else {
        console.log('ℹ️ Specifications column already exists in cart_items table');
      }
    } else {
      // SQLite
      await db.execute(`ALTER TABLE cart_items ADD COLUMN specifications TEXT`);
      console.log('✅ Added specifications column to cart_items table (SQLite)');
    }
  } catch (error) {
    // Ignore if already exists
    const errorMsg = error.message || '';
    if (!errorMsg.includes('duplicate column name') && 
        !errorMsg.includes('already exists') && 
        !errorMsg.includes('column "specifications" of relation "cart_items" already exists')) {
      console.log('⚠️ Specifications column in cart_items already exists or error:', errorMsg);
    } else {
      console.log('ℹ️ Specifications column already exists in cart_items table');
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate }; 
