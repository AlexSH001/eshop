const request = require('supertest');
const express = require('express');

// Create a test app without starting the server
const app = express();
app.use(express.json());

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-testing-purposes-only-32-chars';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Import and apply security middleware
const securityValidation = require('./src/middleware/securityValidation');
const {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  securityHeaders,
  validateRequest
} = require('./src/middleware/security');

// Apply middleware
app.use(securityValidation);
app.use(securityHeaders);
app.use(validateRequest);

// Add test routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/login', (req, res) => {
  res.json({ message: 'login endpoint' });
});

async function testSecurityHeaders() {
  console.log('🔒 Testing Security Headers...');
  
  try {
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    // Check security headers
    const headers = response.headers;
    
    console.log('✅ Security Headers Test:');
    console.log('  X-Content-Type-Options:', headers['x-content-type-options']);
    console.log('  X-Frame-Options:', headers['x-frame-options']);
    console.log('  X-XSS-Protection:', headers['x-xss-protection']);
    console.log('  Referrer-Policy:', headers['referrer-policy']);
    console.log('  X-Request-ID:', headers['x-request-id']);
    
    // Verify required headers are present
    if (headers['x-content-type-options'] === 'nosniff' &&
        headers['x-frame-options'] === 'DENY' &&
        headers['x-xss-protection'] === '1; mode=block') {
      console.log('✅ All security headers are properly set');
    } else {
      console.log('❌ Some security headers are missing or incorrect');
    }
    
  } catch (error) {
    console.error('❌ Security headers test failed:', error.message);
  }
}

async function testRequestValidation() {
  console.log('\n🛡️ Testing Request Validation...');
  
  try {
    // Test with suspicious content
    const response = await request(app)
      .post('/api/auth/login')
      .send({ 
        email: 'test@example.com<script>alert("xss")</script>', 
        password: 'password' 
      })
      .expect(400);
    
    if (response.body.error === 'Invalid request content detected') {
      console.log('✅ Request validation is working (blocked suspicious content)');
    } else {
      console.log('⚠️ Request validation may not be working as expected');
    }
    
  } catch (error) {
    console.error('❌ Request validation test failed:', error.message);
  }
}

async function testSecurityValidation() {
  console.log('\n🔐 Testing Security Validation...');
  
  try {
    // Test with missing environment variables
    const originalJWTSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    
    try {
      require('./src/middleware/auth');
      console.log('❌ Security validation failed - should have thrown error for missing JWT_SECRET');
    } catch (error) {
      if (error.message.includes('JWT secrets must be configured')) {
        console.log('✅ Security validation is working (caught missing JWT_SECRET)');
      } else {
        console.log('⚠️ Unexpected error:', error.message);
      }
    }
    
    // Restore environment variable
    process.env.JWT_SECRET = originalJWTSecret;
    
  } catch (error) {
    console.error('❌ Security validation test failed:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Security Implementation Tests...\n');
  
  await testSecurityHeaders();
  await testRequestValidation();
  await testSecurityValidation();
  
  console.log('\n✅ Security implementation tests completed!');
  process.exit(0);
}

runAllTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
}); 