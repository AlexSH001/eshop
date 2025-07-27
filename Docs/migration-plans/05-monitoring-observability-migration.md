# Monitoring and Observability Migration Plan

## Overview
Implement comprehensive monitoring, logging, error tracking, and observability for production deployment.

## Current Issues
- Basic console.log only
- No structured logging
- No error tracking
- No performance monitoring
- No health checks
- No alerting system
- No metrics collection

## Migration Strategy

### Phase 1: Structured Logging Implementation

#### Step 1: Install Logging Dependencies
```bash
npm install winston winston-daily-rotate-file
npm install --save-dev @types/winston
```

#### Step 2: Create Logging Configuration
Create: `backend/src/config/logger.js`
```javascript
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  // Error log file
  new DailyRotateFile({
    filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // Combined log file
  new DailyRotateFile({
    filename: path.join(__dirname, '../../logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  })
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

module.exports = logger;
```

#### Step 3: Create Logging Middleware
Create: `backend/src/middleware/logging.js`
```javascript
const logger = require('../config/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info(`Incoming ${req.method} request to ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.requestId,
    userId: req.user?.id || 'anonymous'
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    logger.info(`Response ${res.statusCode} for ${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.requestId,
      userId: req.user?.id || 'anonymous'
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

const errorLogger = (err, req, res, next) => {
  logger.error('Unhandled error occurred', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    requestId: req.requestId,
    userId: req.user?.id || 'anonymous',
    body: req.body,
    query: req.query,
    params: req.params
  });

  next(err);
};

module.exports = {
  requestLogger,
  errorLogger
};
```

### Phase 2: Error Tracking Implementation

#### Step 4: Install Error Tracking Dependencies
```bash
npm install @sentry/node @sentry/integrations
```

#### Step 5: Create Error Tracking Configuration
Create: `backend/src/config/sentry.js`
```javascript
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');

const initSentry = (app) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Tracing.Integrations.Express({ app }),
        new Tracing.Integrations.Mongo(),
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection(),
      ],
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1,
      beforeSend(event) {
        // Filter out sensitive data
        if (event.request && event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        return event;
      },
    });

    // RequestHandler creates a separate execution context
    app.use(Sentry.Handlers.requestHandler());
    
    // TracingHandler creates a trace for every incoming request
    app.use(Sentry.Handlers.tracingHandler());
  }
};

const captureException = (error, context = {}) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      extra: context
    });
  }
};

const captureMessage = (message, level = 'info', context = {}) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureMessage(message, {
      level,
      extra: context
    });
  }
};

module.exports = {
  initSentry,
  captureException,
  captureMessage
};
```

### Phase 3: Performance Monitoring

#### Step 6: Install Performance Monitoring Dependencies
```bash
npm install prom-client prometheus-client
```

#### Step 7: Create Metrics Collection
Create: `backend/src/services/metrics.js`
```javascript
const promClient = require('prom-client');

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const databaseQueryDuration = new promClient.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1]
});

const cacheHitRatio = new promClient.Gauge({
  name: 'cache_hit_ratio',
  help: 'Cache hit ratio percentage'
});

// Register metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeConnections);
register.registerMetric(databaseQueryDuration);
register.registerMetric(cacheHitRatio);

class MetricsService {
  recordHttpRequest(method, route, statusCode, duration) {
    httpRequestDurationMicroseconds
      .labels(method, route, statusCode)
      .observe(duration);
    
    httpRequestsTotal
      .labels(method, route, statusCode)
      .inc();
  }

  setActiveConnections(count) {
    activeConnections.set(count);
  }

  recordDatabaseQuery(queryType, duration) {
    databaseQueryDuration
      .labels(queryType)
      .observe(duration);
  }

  setCacheHitRatio(ratio) {
    cacheHitRatio.set(ratio);
  }

  async getMetrics() {
    return await register.metrics();
  }
}

module.exports = new MetricsService();
```

#### Step 8: Create Performance Monitoring Middleware
Create: `backend/src/middleware/performance.js`
```javascript
const metrics = require('../services/metrics');

const performanceMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Override res.end to record metrics
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    
    metrics.recordHttpRequest(
      req.method,
      req.route?.path || req.path,
      res.statusCode,
      duration
    );

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = performanceMiddleware;
```

### Phase 4: Health Checks and Monitoring

#### Step 9: Create Comprehensive Health Checks
Create: `backend/src/services/healthCheck.js`
```javascript
const database = require('../database/postgres');
const redis = require('../config/redis');
const logger = require('../config/logger');

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
      const fs = require('fs');
      const path = require('path');
      
      const uploadsPath = path.join(__dirname, '../../uploads');
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

  async getSystemHealth() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkDiskSpace(),
      this.checkMemoryUsage()
    ]);

    const results = {
      database: checks[0].status === 'fulfilled' ? checks[0].value : { status: 'error', error: checks[0].reason },
      redis: checks[1].status === 'fulfilled' ? checks[1].value : { status: 'error', error: checks[1].reason },
      diskSpace: checks[2].status === 'fulfilled' ? checks[2].value : { status: 'error', error: checks[2].reason },
      memory: checks[3].status === 'fulfilled' ? checks[3].value : { status: 'error', error: checks[3].reason }
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
}

module.exports = new HealthCheckService();
```

#### Step 10: Create Monitoring Routes
Create: `backend/src/routes/monitoring.js`
```javascript
const express = require('express');
const healthCheck = require('../services/healthCheck');
const metrics = require('../services/metrics');
const logger = require('../config/logger');

const router = express.Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const health = await healthCheck.getSystemHealth();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics endpoint for Prometheus
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await metrics.getMetrics());
  } catch (error) {
    logger.error('Metrics error:', error);
    res.status(500).json({ error: 'Metrics collection failed' });
  }
});

// Application info
router.get('/info', (req, res) => {
  res.json({
    name: 'E-Shop API',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version,
    platform: process.platform
  });
});

module.exports = router;
```

### Phase 5: Alerting System

#### Step 11: Create Alerting Service
Create: `backend/src/services/alerting.js`
```javascript
const logger = require('../config/logger');
const { captureMessage } = require('../config/sentry');

class AlertingService {
  constructor() {
    this.alertThresholds = {
      errorRate: 0.05, // 5% error rate
      responseTime: 2000, // 2 seconds
      memoryUsage: 0.9, // 90% memory usage
      diskUsage: 0.9, // 90% disk usage
      databaseConnections: 0.8 // 80% connection pool usage
    };
  }

  async checkErrorRate(errorCount, totalRequests) {
    const errorRate = errorCount / totalRequests;
    
    if (errorRate > this.alertThresholds.errorRate) {
      await this.sendAlert('HIGH_ERROR_RATE', {
        errorRate: `${(errorRate * 100).toFixed(2)}%`,
        threshold: `${(this.alertThresholds.errorRate * 100).toFixed(2)}%`,
        errorCount,
        totalRequests
      });
    }
  }

  async checkResponseTime(avgResponseTime) {
    if (avgResponseTime > this.alertThresholds.responseTime) {
      await this.sendAlert('HIGH_RESPONSE_TIME', {
        avgResponseTime: `${avgResponseTime}ms`,
        threshold: `${this.alertThresholds.responseTime}ms`
      });
    }
  }

  async checkMemoryUsage(memoryUsage) {
    const usageRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;
    
    if (usageRatio > this.alertThresholds.memoryUsage) {
      await this.sendAlert('HIGH_MEMORY_USAGE', {
        usageRatio: `${(usageRatio * 100).toFixed(2)}%`,
        threshold: `${(this.alertThresholds.memoryUsage * 100).toFixed(2)}%`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
      });
    }
  }

  async sendAlert(type, data) {
    const alert = {
      type,
      severity: this.getSeverity(type),
      timestamp: new Date().toISOString(),
      data
    };

    // Log alert
    logger.warn(`Alert: ${type}`, alert);

    // Send to Sentry
    captureMessage(`Alert: ${type}`, 'warning', alert);

    // Send to external alerting service (e.g., PagerDuty, Slack)
    await this.sendToExternalService(alert);
  }

  getSeverity(type) {
    const severityMap = {
      'HIGH_ERROR_RATE': 'critical',
      'HIGH_RESPONSE_TIME': 'warning',
      'HIGH_MEMORY_USAGE': 'critical',
      'DATABASE_CONNECTION_FAILURE': 'critical',
      'REDIS_CONNECTION_FAILURE': 'warning'
    };
    
    return severityMap[type] || 'info';
  }

  async sendToExternalService(alert) {
    // Implement integration with external alerting services
    // Examples: Slack, PagerDuty, Email, etc.
    
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendToSlack(alert);
    }
    
    if (process.env.EMAIL_ALERTS_ENABLED) {
      await this.sendEmailAlert(alert);
    }
  }

  async sendToSlack(alert) {
    try {
      const axios = require('axios');
      
      await axios.post(process.env.SLACK_WEBHOOK_URL, {
        text: `🚨 *${alert.type}* - ${alert.severity.toUpperCase()}`,
        attachments: [{
          fields: Object.entries(alert.data).map(([key, value]) => ({
            title: key,
            value: value.toString(),
            short: true
          }))
        }]
      });
    } catch (error) {
      logger.error('Failed to send Slack alert:', error);
    }
  }

  async sendEmailAlert(alert) {
    // Implement email alerting
    logger.info('Email alert would be sent:', alert);
  }
}

module.exports = new AlertingService();
```

## Testing Plan
1. Test structured logging with different log levels
2. Test error tracking with Sentry
3. Test performance metrics collection
4. Test health check endpoints
5. Test alerting system with various thresholds
6. Load testing with monitoring enabled

## Rollback Plan
1. Keep console.log as fallback
2. Maintain basic health check endpoint
3. Monitor for performance impact
4. Have quick disable toggle for monitoring

## Timeline
- **Week 1**: Implement structured logging
- **Week 2**: Add error tracking and performance monitoring
- **Week 3**: Create health checks and metrics
- **Week 4**: Implement alerting system

## Success Criteria
- [ ] Structured logging working across all endpoints
- [ ] Error tracking capturing all exceptions
- [ ] Performance metrics being collected
- [ ] Health checks responding correctly
- [ ] Alerting system functional
- [ ] Log rotation working properly
- [ ] No performance degradation from monitoring
- [ ] All critical alerts being sent 