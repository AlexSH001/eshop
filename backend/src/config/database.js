const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'postgresql-explore.otxlab.net',
  database: process.env.DB_NAME || 'eshop_db',
  password: process.env.DB_PASSWORD || 'Admin_1234',
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false },
  // Connection pool settings
  max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX) : 20,
  idleTimeoutMillis: process.env.DB_POOL_IDLE_TIMEOUT ? parseInt(process.env.DB_POOL_IDLE_TIMEOUT) : 30000,
  connectionTimeoutMillis: process.env.DB_POOL_CONNECTION_TIMEOUT ? parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT) : 2000,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool; 