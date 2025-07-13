#!/usr/bin/env node

/**
 * Monitoring and Observability Test Script
 * Tests all monitoring components: logging, metrics, health checks, and alerting
 */

const axios = require('axios');
const logger = require('./src/config/logger');
const metrics = require('./src/services/metrics');
const healthCheck = require('./src/services/healthCheck');
const alerting = require('./src/services/alerting');

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api`;

class MonitoringTestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async run() {
    console.log('🧪 Starting Monitoring and Observability Test Suite\n');
    
    try {
      // Test 1: Logger Configuration
      await this.testLogger();
      
      // Test 2: Metrics Collection
      await this.testMetrics();
      
      // Test 3: Health Checks
      await this.testHealthChecks();
      
      // Test 4: Monitoring Endpoints
      await this.testMonitoringEndpoints();
      
      // Test 5: Alerting System
      await this.testAlerting();
      
      // Test 6: Performance Monitoring
      await this.testPerformanceMonitoring();
      
      // Test 7: Error Tracking
      await this.testErrorTracking();
      
      // Test 8: Integration Tests
      await this.testIntegration();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.recordTest('Test Suite', false, error.message);
    }
    
    this.printResults();
  }

  async testLogger() {
    console.log('📝 Testing Logger Configuration...');
    
    try {
      // Test different log levels
      logger.debug('Debug message test');
      logger.info('Info message test');
      logger.warn('Warning message test');
      logger.error('Error message test');
      
      // Test structured logging
      logger.info('Structured log test', {
        userId: 'test-user',
        action: 'test-action',
        metadata: { test: true }
      });
      
      this.recordTest('Logger Configuration', true);
      console.log('✅ Logger tests passed\n');
    } catch (error) {
      this.recordTest('Logger Configuration', false, error.message);
      console.log('❌ Logger tests failed:', error.message, '\n');
    }
  }

  async testMetrics() {
    console.log('📊 Testing Metrics Collection...');
    
    try {
      // Test HTTP request metrics
      metrics.recordHttpRequest('GET', '/test', 200, 0.1);
      metrics.recordHttpRequest('POST', '/test', 201, 0.2);
      metrics.recordHttpRequest('GET', '/test', 404, 0.05);
      
      // Test database metrics
      metrics.recordDatabaseQuery('SELECT', 0.05);
      metrics.recordDatabaseQuery('INSERT', 0.1);
      
      // Test cache metrics
      metrics.recordCacheOperation('get', 'hit');
      metrics.recordCacheOperation('get', 'miss');
      metrics.recordCacheOperation('set', 'success');
      
      // Test memory metrics
      metrics.recordMemoryUsage();
      
      // Test error metrics
      metrics.recordError('validation', 'auth');
      metrics.recordError('database', 'products');
      
      // Test metrics endpoint
      const metricsData = await metrics.getMetrics();
      if (!metricsData || metricsData.length === 0) {
        throw new Error('No metrics data returned');
      }
      
      this.recordTest('Metrics Collection', true);
      console.log('✅ Metrics tests passed\n');
    } catch (error) {
      this.recordTest('Metrics Collection', false, error.message);
      console.log('❌ Metrics tests failed:', error.message, '\n');
    }
  }

  async testHealthChecks() {
    console.log('🏥 Testing Health Checks...');
    
    try {
      // Test individual health checks
      const dbHealth = await healthCheck.checkDatabase();
      if (dbHealth.status !== 'healthy') {
        throw new Error(`Database health check failed: ${dbHealth.error}`);
      }
      
      const redisHealth = await healthCheck.checkRedis();
      if (redisHealth.status !== 'healthy') {
        throw new Error(`Redis health check failed: ${redisHealth.error}`);
      }
      
      const memoryHealth = await healthCheck.checkMemoryUsage();
      if (memoryHealth.status !== 'healthy') {
        throw new Error('Memory health check failed');
      }
      
      const envHealth = await healthCheck.checkEnvironment();
      if (envHealth.status !== 'healthy') {
        throw new Error(`Environment health check failed: ${envHealth.missingVariables}`);
      }
      
      // Test system health
      const systemHealth = await healthCheck.getSystemHealth();
      if (systemHealth.status !== 'healthy') {
        throw new Error('System health check failed');
      }
      
      this.recordTest('Health Checks', true);
      console.log('✅ Health check tests passed\n');
    } catch (error) {
      this.recordTest('Health Checks', false, error.message);
      console.log('❌ Health check tests failed:', error.message, '\n');
    }
  }

  async testMonitoringEndpoints() {
    console.log('🔍 Testing Monitoring Endpoints...');
    
    try {
      // Test health endpoint
      const healthResponse = await axios.get(`${API_BASE}/monitoring/health`);
      if (healthResponse.status !== 200) {
        throw new Error(`Health endpoint returned ${healthResponse.status}`);
      }
      
      // Test metrics endpoint
      const metricsResponse = await axios.get(`${API_BASE}/monitoring/metrics`);
      if (metricsResponse.status !== 200) {
        throw new Error(`Metrics endpoint returned ${metricsResponse.status}`);
      }
      
      if (!metricsResponse.data || metricsResponse.data.length === 0) {
        throw new Error('No metrics data returned from endpoint');
      }
      
      // Test info endpoint
      const infoResponse = await axios.get(`${API_BASE}/monitoring/info`);
      if (infoResponse.status !== 200) {
        throw new Error(`Info endpoint returned ${infoResponse.status}`);
      }
      
      // Test status endpoint
      const statusResponse = await axios.get(`${API_BASE}/monitoring/status`);
      if (statusResponse.status !== 200) {
        throw new Error(`Status endpoint returned ${statusResponse.status}`);
      }
      
      // Test readiness probe
      const readyResponse = await axios.get(`${API_BASE}/monitoring/ready`);
      if (readyResponse.status !== 200) {
        throw new Error(`Readiness probe returned ${readyResponse.status}`);
      }
      
      // Test liveness probe
      const liveResponse = await axios.get(`${API_BASE}/monitoring/live`);
      if (liveResponse.status !== 200) {
        throw new Error(`Liveness probe returned ${liveResponse.status}`);
      }
      
      this.recordTest('Monitoring Endpoints', true);
      console.log('✅ Monitoring endpoint tests passed\n');
    } catch (error) {
      this.recordTest('Monitoring Endpoints', false, error.message);
      console.log('❌ Monitoring endpoint tests failed:', error.message, '\n');
    }
  }

  async testAlerting() {
    console.log('🚨 Testing Alerting System...');
    
    try {
      // Test error rate alert
      await alerting.checkErrorRate(10, 100); // 10% error rate
      
      // Test response time alert
      await alerting.checkResponseTime(3000); // 3 seconds
      
      // Test memory usage alert
      await alerting.checkMemoryUsage({
        heapUsed: 900 * 1024 * 1024, // 900MB
        heapTotal: 1000 * 1024 * 1024 // 1GB
      });
      
      // Test alert thresholds
      const thresholds = alerting.getThresholds();
      if (!thresholds.errorRate || !thresholds.responseTime) {
        throw new Error('Alert thresholds not properly configured');
      }
      
      // Test threshold updates
      alerting.updateThresholds({ errorRate: 0.1 });
      const updatedThresholds = alerting.getThresholds();
      if (updatedThresholds.errorRate !== 0.1) {
        throw new Error('Threshold update failed');
      }
      
      this.recordTest('Alerting System', true);
      console.log('✅ Alerting tests passed\n');
    } catch (error) {
      this.recordTest('Alerting System', false, error.message);
      console.log('❌ Alerting tests failed:', error.message, '\n');
    }
  }

  async testPerformanceMonitoring() {
    console.log('⚡ Testing Performance Monitoring...');
    
    try {
      // Test request metrics recording
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate request
      const duration = (Date.now() - startTime) / 1000;
      
      metrics.recordHttpRequest('GET', '/performance-test', 200, duration);
      
      // Test database query metrics
      const dbStartTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate DB query
      metrics.recordDatabaseMetrics('SELECT', dbStartTime);
      
      // Test cache metrics
      metrics.recordCacheMetrics('get', true); // Cache hit
      metrics.recordCacheMetrics('get', false); // Cache miss
      
      // Test memory usage recording
      metrics.recordMemoryUsage();
      
      this.recordTest('Performance Monitoring', true);
      console.log('✅ Performance monitoring tests passed\n');
    } catch (error) {
      this.recordTest('Performance Monitoring', false, error.message);
      console.log('❌ Performance monitoring tests failed:', error.message, '\n');
    }
  }

  async testErrorTracking() {
    console.log('🔍 Testing Error Tracking...');
    
    try {
      // Test error recording
      metrics.recordError('test', 'monitoring');
      
      // Test error logging
      logger.error('Test error for tracking', {
        component: 'test',
        userId: 'test-user',
        requestId: 'test-request'
      });
      
      // Test structured error logging
      const testError = new Error('Test structured error');
      logger.error('Structured error test', {
        error: testError.message,
        stack: testError.stack,
        component: 'test',
        metadata: { test: true }
      });
      
      this.recordTest('Error Tracking', true);
      console.log('✅ Error tracking tests passed\n');
    } catch (error) {
      this.recordTest('Error Tracking', false, error.message);
      console.log('❌ Error tracking tests failed:', error.message, '\n');
    }
  }

  async testIntegration() {
    console.log('🔗 Testing Integration...');
    
    try {
      // Test that all components work together
      
      // 1. Make a request that triggers logging, metrics, and health checks
      const response = await axios.get(`${API_BASE}/monitoring/health`);
      
      // 2. Verify response includes request ID header
      if (!response.headers['x-request-id']) {
        throw new Error('Request ID header missing');
      }
      
      // 3. Check that metrics were recorded
      const metricsData = await metrics.getMetrics();
      if (!metricsData.includes('http_requests_total')) {
        throw new Error('HTTP request metrics not recorded');
      }
      
      // 4. Verify health check data structure
      if (!response.data.status || !response.data.checks) {
        throw new Error('Health check response structure invalid');
      }
      
      this.recordTest('Integration', true);
      console.log('✅ Integration tests passed\n');
    } catch (error) {
      this.recordTest('Integration', false, error.message);
      console.log('❌ Integration tests failed:', error.message, '\n');
    }
  }

  recordTest(name, passed, error = null) {
    const test = {
      name,
      passed,
      error,
      timestamp: new Date().toISOString()
    };
    
    this.results.tests.push(test);
    
    if (passed) {
      this.results.passed++;
    } else {
      this.results.failed++;
    }
  }

  printResults() {
    console.log('\n📋 Test Results Summary');
    console.log('========================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📊 Total: ${this.results.tests.length}`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n✅ Passed Tests:');
    this.results.tests
      .filter(test => test.passed)
      .forEach(test => {
        console.log(`  - ${test.name}`);
      });
    
    const successRate = ((this.results.passed / this.results.tests.length) * 100).toFixed(1);
    console.log(`\n🎯 Success Rate: ${successRate}%`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 All monitoring tests passed! The observability system is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }
  }
}

// Run the test suite
async function main() {
  const testSuite = new MonitoringTestSuite();
  await testSuite.run();
}

// Handle command line arguments
if (require.main === module) {
  main().catch(console.error);
}

module.exports = MonitoringTestSuite; 