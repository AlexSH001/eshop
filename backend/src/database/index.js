const { database: sqliteDatabase, initializeDatabase: initializeSqliteDatabase } = require('./init');
const { postgresDatabase, initializePostgresDatabase } = require('./init-postgres');
const { adapter } = require('./adapter');

class DatabaseManager {
  constructor() {
    this.database = null;
    this.dbType = null;
  }

  // 根据环境变量选择数据库类型
  getDatabaseType() {
    const dbClient = process.env.DB_CLIENT || 'sqlite3';
    return dbClient.toLowerCase();
  }

  // 初始化数据库连接
  async initialize() {
    const dbType = this.getDatabaseType();
    this.dbType = dbType;

    try {
      if (dbType === 'sqlite3' || dbType === 'sqlite') {
        console.log('🔧 Initializing SQLite database...');
        await initializeSqliteDatabase();
        this.database = sqliteDatabase;
        console.log('✅ SQLite database initialized successfully');
      } else if (dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql') {
        console.log('🔧 Initializing PostgreSQL database...');
        await initializePostgresDatabase();
        this.database = postgresDatabase;
        console.log('✅ PostgreSQL database initialized successfully');
      } else {
        throw new Error(`Unsupported database type: ${dbType}. Supported types: sqlite3, pg`);
      }
    } catch (error) {
      console.error(`❌ Failed to initialize ${dbType} database:`, error);
      throw error;
    }
  }

  // 获取数据库实例
  getDatabase() {
    if (!this.database) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.database;
  }

  // 获取数据库类型
  getType() {
    return this.dbType;
  }

  // 健康检查
  async healthCheck() {
    if (!this.database) {
      return { status: 'unhealthy', error: 'Database not initialized' };
    }

    try {
      if (this.dbType === 'sqlite3' || this.dbType === 'sqlite') {
        const result = await this.database.query('SELECT 1 as health_check');
        return { status: 'healthy', timestamp: new Date().toISOString() };
      } else {
        return await this.database.healthCheck();
      }
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  // 关闭数据库连接
  async close() {
    if (this.database && typeof this.database.close === 'function') {
      await this.database.close();
    }
  }
}

// 创建单例实例
const databaseManager = new DatabaseManager();

// 统一的数据库操作接口
class DatabaseInterface {
  constructor() {
    this.db = null;
  }

  // 初始化数据库
  async initialize() {
    await databaseManager.initialize();
    this.db = databaseManager.getDatabase();
  }

  // 查询多条记录
  async query(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    // 自动转换SQL和参数
    const convertedSql = adapter.convertPlaceholders(sql, params);
    const convertedParams = adapter.convertParams(params);
    
    const result = await this.db.query(convertedSql, convertedParams);
    return adapter.convertResult(result, 'query');
  }

  // 执行INSERT, UPDATE, DELETE操作
  async execute(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    // 自动转换SQL和参数
    const convertedSql = adapter.convertPlaceholders(sql, params);
    const convertedParams = adapter.convertParams(params);
    
    const result = await this.db.execute(convertedSql, convertedParams);
    return adapter.convertResult(result, 'execute');
  }

  // 获取单条记录
  async get(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    // 自动转换SQL和参数
    const convertedSql = adapter.convertPlaceholders(sql, params);
    const convertedParams = adapter.convertParams(params);
    
    const result = await this.db.get(convertedSql, convertedParams);
    return adapter.convertResult(result, 'get');
  }

  // 开始事务
  async beginTransaction() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return await this.db.beginTransaction();
  }

  // 提交事务
  async commit(client) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return await this.db.commit(client);
  }

  // 回滚事务
  async rollback(client) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return await this.db.rollback(client);
  }

  // 事务包装器
  async transaction(callback) {
    return await adapter.handleTransaction(this.db, callback);
  }

  // 健康检查
  async healthCheck() {
    return await databaseManager.healthCheck();
  }

  // 获取数据库类型
  getType() {
    return databaseManager.getType();
  }

  // 关闭连接
  async close() {
    await databaseManager.close();
  }

  // 获取适配器
  getAdapter() {
    return adapter;
  }
}

// 创建全局数据库实例
const db = new DatabaseInterface();

// 导出统一的接口
module.exports = {
  db,
  DatabaseInterface,
  DatabaseManager,
  databaseManager,
  adapter,
  
  // 兼容性导出
  database: db,
  initializeDatabase: () => db.initialize(),
  
  // 直接方法导出，方便使用
  query: (sql, params) => db.query(sql, params),
  execute: (sql, params) => db.execute(sql, params),
  get: (sql, params) => db.get(sql, params),
  beginTransaction: () => db.beginTransaction(),
  commit: (client) => db.commit(client),
  rollback: (client) => db.rollback(client),
  transaction: (callback) => db.transaction(callback),
  healthCheck: () => db.healthCheck(),
  getType: () => db.getType(),
  close: () => db.close(),
  
  // 适配器方法
  convertPlaceholders: (sql, params) => adapter.convertPlaceholders(sql, params),
  getLimitSyntax: (limit, offset) => adapter.getLimitSyntax(limit, offset),
  getLikeSyntax: (column, paramIndex) => adapter.getLikeSyntax(column, paramIndex)
}; 