const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/store.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

class Database {
  constructor() {
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          // Enable foreign keys
          this.db.run('PRAGMA foreign_keys = ON');
          resolve();
        }
      });
    });
  }

  async initializeSchema() {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
      this.db.exec(schema, (err) => {
        if (err) {
          console.error('Error initializing schema:', err);
          reject(err);
        } else {
          console.log('✅ Database schema initialized');
          // Run migrations for existing databases
          this.runMigrations().then(() => resolve()).catch((migrationErr) => {
            console.warn('⚠️ Migration warning:', migrationErr.message);
            resolve(); // Don't fail initialization if migration has issues
          });
        }
      });
    });
  }

  async runMigrations() {
    return new Promise((resolve, reject) => {
      // Add specifications column to cart_items if it doesn't exist
      this.db.run(`ALTER TABLE cart_items ADD COLUMN specifications TEXT`, (err) => {
        if (err) {
          // Ignore if column already exists
          if (err.message.includes('duplicate column name')) {
            console.log('ℹ️ Specifications column already exists in cart_items table');
            resolve();
          } else {
            reject(err);
          }
        } else {
          console.log('✅ Added specifications column to cart_items table');
          resolve();
        }
      });
    });
  }

  // Generic query method
  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Execute method for INSERT, UPDATE, DELETE
  async execute(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  // Get single row
  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Begin transaction
  async beginTransaction() {
    return this.execute('BEGIN TRANSACTION');
  }

  // Commit transaction
  async commit() {
    return this.execute('COMMIT');
  }

  // Rollback transaction
  async rollback() {
    return this.execute('ROLLBACK');
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

// Create singleton instance
const database = new Database();

async function initializeDatabase() {
  try {
    await database.connect();
    await database.initializeSchema();
    console.log('🚀 Database initialization complete');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Export both the class and singleton instance
module.exports = {
  Database,
  database,
  initializeDatabase
};
