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

// Run migration if this file is executed directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate }; 
