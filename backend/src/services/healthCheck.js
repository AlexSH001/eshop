const database = require('../database/init-postgres');
const redis = require('../config/redis');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');

class HealthCheckService {
  async checkDatabase() {
    try {
      const start = Date.now();
      await database.query('SELECT 1');
      const duration = Date.now() - start;
      
      return {
        status: 'healthy',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkRedis() {
    try {
      const start = Date.now();
      await redis.ping();
      const duration = Date.now() - start;
      
      return {
        status: 'healthy',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkDiskSpace() {
    try {
      const uploadsPath = path.join(__dirname, '../../uploads');
      
      // Check if uploads directory exists
      if (!fs.existsSync(uploadsPath)) {
        fs.mkdirSync(uploadsPath, { recursive: true });
      }
      
      const stats = fs.statSync(uploadsPath);
      
      return {
        status: 'healthy',
        availableSpace: stats.size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Disk space check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkMemoryUsage() {
    const usage = process.memoryUsage();
    
    return {
      status: 'healthy',
      memory: {
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`
      },
      timestamp: new Date().toISOString()
    };
  }

  async checkLogFiles() {
    try {
      const logsDir = path.join(__dirname, '../../logs');
      
      if (!fs.existsSync(logsDir)) {
        return {
          status: 'healthy',
          message: 'Logs directory does not exist yet',
          timestamp: new Date().toISOString()
        };
      }
      
      const files = fs.readdirSync(logsDir);
      
      return {
        status: 'healthy',
        logFiles: files.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Log files check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkEnvironment() {
    const requiredEnvVars = [
      'NODE_ENV',
      'PORT',
      'JWT_SECRET',
      'DB_HOST',
      'DB_PORT',
      'DB_NAME',
      'DB_USER'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    return {
      status: missingVars.length === 0 ? 'healthy' : 'unhealthy',
      missingVariables: missingVars,
      timestamp: new Date().toISOString()
    };
  }

  async getSystemHealth() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkDiskSpace(),
      this.checkMemoryUsage(),
      this.checkLogFiles(),
      this.checkEnvironment()
    ]);

    const results = {
      database: checks[0].status === 'fulfilled' ? checks[0].value : { status: 'error', error: checks[0].reason },
      redis: checks[1].status === 'fulfilled' ? checks[1].value : { status: 'error', error: checks[1].reason },
      diskSpace: checks[2].status === 'fulfilled' ? checks[2].value : { status: 'error', error: checks[2].reason },
      memory: checks[3].status === 'fulfilled' ? checks[3].value : { status: 'error', error: checks[3].reason },
      logFiles: checks[4].status === 'fulfilled' ? checks[4].value : { status: 'error', error: checks[4].reason },
      environment: checks[5].status === 'fulfilled' ? checks[5].value : { status: 'error', error: checks[5].reason }
    };

    const overallStatus = Object.values(results).every(check => check.status === 'healthy') ? 'healthy' : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      checks: results
    };
  }

  async getDetailedHealth() {
    const systemHealth = await this.getSystemHealth();
    
    // Add additional detailed information
    const detailedHealth = {
      ...systemHealth,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        title: process.title
      },
      process: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        resourceUsage: process.resourceUsage()
      }
    };

    return detailedHealth;
  }
}

module.exports = new HealthCheckService(); 