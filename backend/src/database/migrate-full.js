const { migrateToPostgres } = require('./migrate-postgres');
const { migrateDataFromSQLite } = require('./migrate-data');
const { postgresDatabase } = require('./init-postgres');

async function performFullMigration() {
  console.log('🚀 Starting full migration from SQLite to PostgreSQL...');
  
  try {
    // Step 1: Create PostgreSQL schema
    console.log('\n📋 Step 1: Creating PostgreSQL schema...');
    await migrateToPostgres();
    
    // Step 2: Migrate data from SQLite
    console.log('\n📊 Step 2: Migrating data from SQLite...');
    await migrateDataFromSQLite();
    
    // Step 3: Verify migration
    console.log('\n✅ Step 3: Verifying migration...');
    const stats = await postgresDatabase.getStats();
    console.log('📊 PostgreSQL database stats:', stats);
    
    // Step 4: Health check
    const health = await postgresDatabase.healthCheck();
    console.log('🏥 Database health:', health.status);
    
    console.log('\n🎉 Full migration completed successfully!');
    console.log('✅ PostgreSQL is now ready for production use');
    
  } catch (error) {
    console.error('\n❌ Full migration failed:', error);
    throw error;
  }
}

// Run full migration if called directly
if (require.main === module) {
  performFullMigration()
    .then(() => {
      console.log('\n🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { performFullMigration }; 