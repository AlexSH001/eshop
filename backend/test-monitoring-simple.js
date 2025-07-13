#!/usr/bin/env node

/**
 * Simple Monitoring Test Script
 * Quick verification of monitoring components
 */

const axios = require('axios');
const logger = require('./src/config/logger');
const metrics = require('./src/services/metrics');
const healthCheck = require('./src/services/healthCheck');

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api`;

async function testMonitoring() {
  console.log('🧪 Testing Monitoring System...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Logger
  try {
    logger.info('Test log message');
    logger.warn('Test warning message');
    logger.error('Test error message');
    console.log('✅ Logger working');
    passed++;
  } catch (error) {
    console.log('❌ Logger failed:', error.message);
    failed++;
  }
  
  // Test 2: Metrics
  try {
    metrics.recordHttpRequest('GET', '/test', 200, 0.1);
    metrics.recordDatabaseQuery('SELECT', 0.05);
    metrics.recordMemoryUsage();
    const metricsData = await metrics.getMetrics();
    if (metricsData && metricsData.length > 0) {
      console.log('✅ Metrics working');
      passed++;
    } else {
      throw new Error('No metrics data');
    }
  } catch (error) {
    console.log('❌ Metrics failed:', error.message);
    failed++;
  }
  
  // Test 3: Health Checks
  try {
    const health = await healthCheck.getSystemHealth();
    if (health.status && health.checks) {
      console.log('✅ Health checks working');
      passed++;
    } else {
      throw new Error('Invalid health check response');
    }
  } catch (error) {
    console.log('❌ Health checks failed:', error.message);
    failed++;
  }
  
  // Test 4: Monitoring Endpoints
  try {
    const healthResponse = await axios.get(`${API_BASE}/monitoring/health`);
    const metricsResponse = await axios.get(`${API_BASE}/monitoring/metrics`);
    
    if (healthResponse.status === 200 && metricsResponse.status === 200) {
      console.log('✅ Monitoring endpoints working');
      passed++;
    } else {
      throw new Error('Endpoint status codes not 200');
    }
  } catch (error) {
    console.log('❌ Monitoring endpoints failed:', error.message);
    failed++;
  }
  
  // Results
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All monitoring tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.');
  }
}

// Run tests
testMonitoring().catch(console.error); 