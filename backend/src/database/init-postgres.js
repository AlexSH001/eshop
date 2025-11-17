const pool = require('../config/database');
const { postgresSchema } = require('./migrate-postgres');

class PostgresDatabase {
  constructor() {
    this.pool = pool;
  }

  async connect() {
    try {
      const client = await this.pool.connect();
      console.log('✅ Connected to PostgreSQL database');
      client.release();
    } catch (error) {
      console.error('❌ Error connecting to PostgreSQL:', error);
      throw error;
    }
  }

  async initializeSchema() {
    const client = await this.pool.connect();
    
    try {
      console.log('📋 Initializing PostgreSQL schema...');
      await client.query(postgresSchema);
      console.log('✅ Database schema initialized');
      
      // Run migrations for existing databases
      await this.runMigrations(client);
    } catch (error) {
      console.error('❌ Error initializing schema:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations(client) {
    try {
      // Check if specifications column exists in cart_items
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'specifications'
      `);
      
      if (columnCheck.rows.length === 0) {
        await client.query(`ALTER TABLE cart_items ADD COLUMN specifications JSONB`);
        console.log('✅ Added specifications column to cart_items table');
      }
    } catch (error) {
      // Ignore if column already exists or other non-critical errors
      if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
        console.warn('⚠️ Migration warning:', error.message);
      }
    }
  }

  // Generic query method
  async query(sql, params = []) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Execute method for INSERT, UPDATE, DELETE
  async execute(sql, params = []) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(sql, params);
      return {
        rowCount: result.rowCount,
        rows: result.rows
      };
    } finally {
      client.release();
    }
  }

  // Get single row
  async get(sql, params = []) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(sql, params);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Begin transaction
  async beginTransaction() {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  // Commit transaction
  async commit(client) {
    await client.query('COMMIT');
    client.release();
  }

  // Rollback transaction
  async rollback(client) {
    await client.query('ROLLBACK');
    client.release();
  }

  // Close database connection pool
  async close() {
    await this.pool.end();
    console.log('Database connection pool closed');
  }

  // Health check
  async healthCheck() {
    try {
      const result = await this.query('SELECT NOW() as current_time');
      return {
        status: 'healthy',
        timestamp: result[0].current_time
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  // Get database statistics
  async getStats() {
    try {
      const stats = {};
      
      // Get table counts
      const tables = ['users', 'products', 'categories', 'orders', 'cart_items'];
      for (const table of tables) {
        const result = await this.query(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = parseInt(result[0].count);
      }
      
      // Get database size
      const sizeResult = await this.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      stats.databaseSize = sizeResult[0].size;
      
      return stats;
    } catch (error) {
      console.error('Error getting database stats:', error);
      return { error: error.message };
    }
  }
}

// Create singleton instance
const postgresDatabase = new PostgresDatabase();

async function initializePostgresDatabase() {
  try {
    await postgresDatabase.connect();
    await postgresDatabase.initializeSchema();
    console.log('🚀 PostgreSQL database initialization complete');
    
    // Run health check
    const health = await postgresDatabase.healthCheck();
    console.log('🏥 Database health:', health.status);
    
    // Get initial stats
    const stats = await postgresDatabase.getStats();
    console.log('📊 Database stats:', stats);
    
  } catch (error) {
    console.error('❌ PostgreSQL database initialization failed:', error);
    throw error;
  }
}

// Export both the class and singleton instance
module.exports = {
  PostgresDatabase,
  postgresDatabase,
  initializePostgresDatabase
}; 