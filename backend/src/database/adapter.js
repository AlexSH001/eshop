const { getType } = require('./index');

class DatabaseAdapter {
  constructor() {
    this.dbType = null;
  }

  // 获取数据库类型
  getDatabaseType() {
    if (!this.dbType) {
      const dbClient = process.env.DB_CLIENT || 'sqlite3';
      this.dbType = dbClient.toLowerCase();
    }
    return this.dbType;
  }

  // 转换SQL参数占位符
  // SQLite使用 ? 占位符，PostgreSQL使用 $1, $2, $3 等
  convertPlaceholders(sql, params = []) {
    const dbType = this.getDatabaseType();
    
    if (dbType === 'sqlite3' || dbType === 'sqlite') {
      // PostgreSQL -> SQLite: 将 $1, $2, $3 转换为 ?, ?, ?
      return sql.replace(/\$(\d+)/g, '?');
    } else if (dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql') {
      // SQLite -> PostgreSQL: 将 ? 转换为 $1, $2, $3
      let paramIndex = 1;
      return sql.replace(/\?/g, () => `$${paramIndex++}`);
    }
    
    return sql;
  }

  // 转换参数数组（如果需要）
  convertParams(params = []) {
    // 目前两个数据库都支持数组参数，所以直接返回
    return params;
  }

  // 转换查询结果（如果需要）
  convertResult(result, operation = 'query') {
    const dbType = this.getDatabaseType();
    
    if (dbType === 'sqlite3' || dbType === 'sqlite') {
      // SQLite的execute返回 { id: lastID, changes: changes }
      if (operation === 'execute') {
        return result;
      }
      // SQLite的query直接返回rows数组
      return result;
    } else if (dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql') {
      // PostgreSQL的execute返回 { rowCount, rows }
      if (operation === 'execute') {
        return {
          id: result.rows[0]?.id || null,
          changes: result.rowCount
        };
      }
      // PostgreSQL的query返回rows数组
      return result;
    }
    
    return result;
  }

  // 处理事务差异
  async handleTransaction(db, callback) {
    const dbType = this.getDatabaseType();
    
    if (dbType === 'sqlite3' || dbType === 'sqlite') {
      // SQLite事务处理
      await db.beginTransaction();
      try {
        const result = await callback();
        await db.commit();
        return result;
      } catch (error) {
        await db.rollback();
        throw error;
      }
    } else if (dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql') {
      // PostgreSQL事务处理
      const client = await db.beginTransaction();
      try {
        const result = await callback(client);
        await db.commit(client);
        return result;
      } catch (error) {
        await db.rollback(client);
        throw error;
      }
    }
  }

  // 获取数据库特定的LIMIT语法
  getLimitSyntax(limit, offset = 0) {
    const dbType = this.getDatabaseType();
    
    if (dbType === 'sqlite3' || dbType === 'sqlite') {
      return `LIMIT ? OFFSET ?`;
    } else if (dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql') {
      return `LIMIT $${limit} OFFSET $${offset}`;
    }
    
    return `LIMIT ${limit} OFFSET ${offset}`;
  }

  // 获取数据库特定的LIKE语法
  getLikeSyntax(column, paramIndex) {
    const dbType = this.getDatabaseType();
    
    if (dbType === 'sqlite3' || dbType === 'sqlite') {
      return `${column} LIKE ?`;
    } else if (dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql') {
      return `${column} LIKE $${paramIndex}`;
    }
    
    return `${column} LIKE ?`;
  }
}

// 创建单例实例
const adapter = new DatabaseAdapter();

module.exports = {
  DatabaseAdapter,
  adapter,
  
  // 便捷方法
  convertPlaceholders: (sql, params) => adapter.convertPlaceholders(sql, params),
  convertParams: (params) => adapter.convertParams(params),
  convertResult: (result, operation) => adapter.convertResult(result, operation),
  handleTransaction: (db, callback) => adapter.handleTransaction(db, callback),
  getLimitSyntax: (limit, offset) => adapter.getLimitSyntax(limit, offset),
  getLikeSyntax: (column, paramIndex) => adapter.getLikeSyntax(column, paramIndex)
}; 