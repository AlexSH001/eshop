const { Pool } = require('pg');

const adminPool = new Pool({
  user: 'postgres',
  host: 'postgresql-explore.otxlab.net',
  database: 'postgres', // Connect to default postgres database
  password: 'Admin_1234',
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

async function setupDatabase() {
  console.log('🗄️  Setting up eshop_db database...');
  
  try {
    const client = await adminPool.connect();
    
    // Check if eshop_db exists
    const dbExists = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'eshop_db'"
    );
    
    if (dbExists.rows.length === 0) {
      console.log('📋 Creating eshop_db database...');
      await client.query('CREATE DATABASE eshop_db');
      console.log('✅ eshop_db database created successfully');
    } else {
      console.log('✅ eshop_db database already exists');
    }
    
    client.release();
    
    // Test connection to eshop_db
    console.log('🔌 Testing connection to eshop_db...');
    const eshopPool = new Pool({
      user: 'postgres',
      host: 'postgresql-explore.otxlab.net',
      database: 'eshop_db',
      password: 'Admin_1234',
      port: 5432,
      ssl: { rejectUnauthorized: false },
    });
    
    const eshopClient = await eshopPool.connect();
    console.log('✅ Successfully connected to eshop_db');
    
    // Test basic query
    const result = await eshopClient.query('SELECT current_database() as db_name');
    console.log('📋 Connected to database:', result.rows[0].db_name);
    
    eshopClient.release();
    await eshopPool.end();
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    throw error;
  } finally {
    await adminPool.end();
  }
}

setupDatabase()
  .then(() => {
    console.log('🎉 Database setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database setup failed:', error);
    process.exit(1);
  }); 