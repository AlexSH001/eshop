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

const cacheOperations = new promClient.Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'status']
});

const redisConnections = new promClient.Gauge({
  name: 'redis_connections',
  help: 'Number of Redis connections'
});

const memoryUsage = new promClient.Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type']
});

const errorRate = new promClient.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'component']
});

// Register metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeConnections);
register.registerMetric(databaseQueryDuration);
register.registerMetric(cacheHitRatio);
register.registerMetric(cacheOperations);
register.registerMetric(redisConnections);
register.registerMetric(memoryUsage);
register.registerMetric(errorRate);

class MetricsService {
  recordHttpRequest(method, route, statusCode, duration) {
    const routePath = route || 'unknown';
    
    httpRequestDurationMicroseconds
      .labels(method, routePath, statusCode.toString())
      .observe(duration);
    
    httpRequestsTotal
      .labels(method, routePath, statusCode.toString())
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

  recordCacheOperation(operation, status) {
    cacheOperations
      .labels(operation, status)
      .inc();
  }

  setRedisConnections(count) {
    redisConnections.set(count);
  }

  recordMemoryUsage() {
    const usage = process.memoryUsage();
    
    memoryUsage.labels('rss').set(usage.rss);
    memoryUsage.labels('heapTotal').set(usage.heapTotal);
    memoryUsage.labels('heapUsed').set(usage.heapUsed);
    memoryUsage.labels('external').set(usage.external);
  }

  recordError(type, component) {
    errorRate
      .labels(type, component)
      .inc();
  }

  async getMetrics() {
    // Update memory usage before returning metrics
    this.recordMemoryUsage();
    
    return await register.metrics();
  }

  // Helper method to get route path from request
  getRoutePath(req) {
    return req.route?.path || req.path || 'unknown';
  }

  // Helper method to record request metrics
  recordRequestMetrics(req, res, duration) {
    const method = req.method;
    const route = this.getRoutePath(req);
    const statusCode = res.statusCode;
    
    this.recordHttpRequest(method, route, statusCode, duration);
  }

  // Helper method to record database metrics
  recordDatabaseMetrics(queryType, startTime) {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    this.recordDatabaseQuery(queryType, duration);
  }

  // Helper method to record cache metrics
  recordCacheMetrics(operation, hit) {
    const status = hit ? 'hit' : 'miss';
    this.recordCacheOperation(operation, status);
  }
}

module.exports = new MetricsService(); 