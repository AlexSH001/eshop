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

// Detailed health check endpoint
router.get('/health/detailed', async (req, res) => {
  try {
    const health = await healthCheck.getDetailedHealth();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Detailed health check error:', error);
    res.status(503).json({
      status: 'error',
      error: 'Detailed health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Individual health checks
router.get('/health/database', async (req, res) => {
  try {
    const health = await healthCheck.checkDatabase();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Database health check error:', error);
    res.status(503).json({
      status: 'error',
      error: 'Database health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/health/redis', async (req, res) => {
  try {
    const health = await healthCheck.checkRedis();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Redis health check error:', error);
    res.status(503).json({
      status: 'error',
      error: 'Redis health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics endpoint for Prometheus
router.get('/metrics', async (req, res) => {
  try {
    const metricsData = await metrics.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.end(metricsData);
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
    platform: process.platform,
    timestamp: new Date().toISOString()
  });
});

// Status endpoint (simple health check)
router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Readiness probe (for Kubernetes)
router.get('/ready', async (req, res) => {
  try {
    const health = await healthCheck.getSystemHealth();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      ready: health.status === 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness probe error:', error);
    res.status(503).json({
      ready: false,
      error: 'Readiness probe failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness probe (for Kubernetes)
router.get('/live', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router; 