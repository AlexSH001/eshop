const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'postgresql-explore.otxlab.net',
  database: 'postgres', // Try connecting to default postgres database first
  password: 'Admin_1234',
  port: 5432,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
});

async function testConnection() {
  console.log('🔌 Testing PostgreSQL connection...');
  
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully!');
    
    // Test basic query
    const result = await client.query('SELECT version()');
    console.log('📋 PostgreSQL version:', result.rows[0].version);
    
    // List databases
    const databases = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false");
    console.log('🗄️  Available databases:');
    databases.rows.forEach(db => console.log(`  - ${db.datname}`));
    
    // Check if eshop_db exists
    const eshopDbExists = databases.rows.find(db => db.datname === 'eshop_db');
    if (eshopDbExists) {
      console.log('✅ eshop_db database exists');
    } else {
      console.log('⚠️  eshop_db database does not exist, will create it');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await pool.end();
  }
}

testConnection(); 