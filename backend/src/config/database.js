const { Pool } = require('pg');
require('dotenv').config();

const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
const resolvedHost = process.env.DB_HOST || (isProduction ? 'postgres' : 'localhost');
const resolvedPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432;
const useSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';

const pool = new Pool({
  user: process.env.DB_USER,
  host: resolvedHost,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: resolvedPort,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
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