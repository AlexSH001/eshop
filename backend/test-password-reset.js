const { database, initializeDatabase } = require('./src/database');
const { generateToken } = require('./src/utils/auth');
const emailService = require('./src/services/emailService');

async function testPasswordReset() {
  // Initialize database first
  await initializeDatabase();
  console.log('🧪 Testing Password Reset Functionality');
  console.log('=====================================');

  try {
    // Test 1: Check if email service is configured
    console.log('\n1. Testing Email Service Configuration...');
    const emailTest = await emailService.testConnection();
    console.log('Email service status:', emailTest.success ? '✅ Configured' : '❌ Not configured');
    if (!emailTest.success) {
      console.log('   Note: Email service needs SMTP configuration to send emails');
    }

    // Test 2: Check if email_tokens table exists
    console.log('\n2. Testing Database Schema...');
    const tableExists = await database.get(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='email_tokens'
    `);
    console.log('Email tokens table:', tableExists ? '✅ Exists' : '❌ Missing');

    // Test 3: Test token generation
    console.log('\n3. Testing Token Generation...');
    const testToken = generateToken();
    console.log('Generated token:', testToken ? '✅ Success' : '❌ Failed');
    console.log('Token length:', testToken.length);

    // Test 4: Test database operations
    console.log('\n4. Testing Database Operations...');
    
    // Find a test user
    const testUser = await database.get('SELECT id, email, first_name FROM users LIMIT 1');
    if (testUser) {
      console.log('Test user found:', testUser.email);
      
      // Test inserting a reset token
      const resetToken = generateToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      
      await database.execute(
        'DELETE FROM email_tokens WHERE user_id = ? AND type = ?',
        [testUser.id, 'reset']
      );
      
      await database.execute(
        'INSERT INTO email_tokens (user_id, token, type, expires_at) VALUES (?, ?, ?, ?)',
        [testUser.id, resetToken, 'reset', expiresAt]
      );
      console.log('✅ Reset token inserted successfully');
      
      // Test retrieving the token
      const tokenRecord = await database.get(
        `SELECT et.*, u.email 
         FROM email_tokens et 
         JOIN users u ON et.user_id = u.id 
         WHERE et.token = ? AND et.type = ? AND et.used_at IS NULL`,
        [resetToken, 'reset']
      );
      console.log('Token retrieval:', tokenRecord ? '✅ Success' : '❌ Failed');
      
      // Clean up
      await database.execute('DELETE FROM email_tokens WHERE token = ?', [resetToken]);
      console.log('✅ Test token cleaned up');
      
    } else {
      console.log('❌ No test user found in database');
    }

    console.log('\n🎉 Password Reset Tests Completed!');
    console.log('\nTo test the full functionality:');
    console.log('1. Configure SMTP settings in your .env file');
    console.log('2. Start the backend server: npm run dev');
    console.log('3. Visit http://localhost:3000/forgot-password');
    console.log('4. Enter an email address to test the reset flow');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testPasswordReset(); 