const express = require('express');
const { database } = require('../database');
const {
  hashPassword,
  comparePassword,
  formatUserResponse,
  formatAdminResponse,
  generateToken
} = require('../utils/auth');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  authenticateUser,
  authenticateAdmin
} = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  adminLoginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  verifyResetTokenValidation
} = require('../middleware/validation');
const {
  ConflictError,
  UnauthorizedError,
  NotFoundError
} = require('../middleware/errorHandler');
const { refreshLimiter } = require('../middleware/security');
const emailService = require('../services/emailService');
const logger = require('../config/logger');

const router = express.Router();

// User Registration
router.post('/register', registerValidation, async (req, res) => {
  const { email, password, firstName, lastName, phone } = req.body;

  // Check if user already exists
  const existingUser = await database.get(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const result = await database.execute(
    `INSERT INTO users (email, password, first_name, last_name, phone)
     VALUES ($1, $2, $3, $4, $5)`,
    [email, hashedPassword, firstName, lastName, phone || null]
  );

  // Get created user (without password)
  const user = await database.get(
    'SELECT id, email, first_name, last_name, phone, avatar, created_at FROM users WHERE id = $1',
    [result.id]
  );

  // Generate tokens
  const accessToken = generateAccessToken({ userId: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

  res.status(201).json({
    message: 'User registered successfully',
    user: formatUserResponse(user),
    tokens: {
      accessToken,
      refreshToken
    }
  });
});

// User Login
router.post('/login', loginValidation, async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await database.get(
    'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
    [email]
  );

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check password
  const isValidPassword = await comparePassword(password, user.password);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Generate tokens
  const accessToken = generateAccessToken({ userId: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

  res.json({
    message: 'Login successful',
    user: formatUserResponse(user),
    tokens: {
      accessToken,
      refreshToken
    }
  });
});

// Admin Login
router.post('/admin/login', adminLoginValidation, async (req, res) => {
  const { email, password } = req.body;

  // Find admin
  const admin = await database.get(
    'SELECT * FROM admins WHERE email = $1 AND is_active = TRUE',
    [email]
  );

  if (!admin) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check password
  const isValidPassword = await comparePassword(password, admin.password);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Update last login
  await database.execute(
    'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
    [admin.id]
  );

  // Generate tokens
  const accessToken = generateAccessToken({
    adminId: admin.id,
    email: admin.email,
    role: admin.role
  });
  const refreshToken = generateRefreshToken({
    adminId: admin.id,
    email: admin.email,
    role: admin.role
  });

  res.json({
    message: 'Admin login successful',
    admin: formatAdminResponse(admin),
    tokens: {
      accessToken,
      refreshToken
    }
  });
});

// Refresh Token (with separate rate limiting)
router.post('/refresh', refreshLimiter, async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token required');
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);

    let newAccessToken;
    let userData = null;

    if (decoded.userId) {
      // User token
      const user = await database.get(
        'SELECT id, email, first_name, last_name, phone, avatar FROM users WHERE id = $1 AND is_active = TRUE',
        [decoded.userId]
      );

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      newAccessToken = generateAccessToken({ userId: user.id, email: user.email });
      userData = { user: formatUserResponse(user) };
    } else if (decoded.adminId) {
      // Admin token
      const admin = await database.get(
        'SELECT id, email, name, role, avatar FROM admins WHERE id = $1 AND is_active = TRUE',
        [decoded.adminId]
      );

      if (!admin) {
        throw new UnauthorizedError('Admin not found');
      }

      newAccessToken = generateAccessToken({
        adminId: admin.id,
        email: admin.email,
        role: admin.role
      });
      userData = { admin: formatAdminResponse(admin) };
    } else {
      throw new UnauthorizedError('Invalid refresh token');
    }

    res.json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
      ...userData
    });
  } catch (error) {
    throw new UnauthorizedError('Invalid refresh token');
  }
});

// Get Current User
router.get('/me', authenticateUser, async (req, res) => {
  res.json({
    user: req.user
  });
});

// Get Current Admin
router.get('/admin/me', authenticateAdmin, async (req, res) => {
  res.json({
    admin: req.admin
  });
});

// Update User Profile
router.put('/profile', authenticateUser, async (req, res) => {
  const { firstName, lastName, phone } = req.body;
  const userId = req.user.id;

  // Update user
  await database.execute(
    `UPDATE users
     SET first_name = $1, last_name = $2, phone = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [firstName, lastName, phone || null, userId]
  );

  // Get updated user
  const user = await database.get(
    'SELECT id, email, first_name, last_name, phone, avatar, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  );

  res.json({
    message: 'Profile updated successfully',
    user: formatUserResponse(user)
  });
});

// Change Password
router.put('/password', authenticateUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  // Get current user with password
  const user = await database.get(
    'SELECT password FROM users WHERE id = $1',
    [userId]
  );

  // Verify current password
  const isValidPassword = await comparePassword(currentPassword, user.password);
  if (!isValidPassword) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password
  await database.execute(
    'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [hashedPassword, userId]
  );

  res.json({
    message: 'Password updated successfully'
  });
});

// Request Password Reset
router.post('/forgot-password', forgotPasswordValidation, async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists
    const user = await database.get(
      'SELECT id, email, first_name FROM users WHERE email = $1 AND is_active = TRUE',
      [email]
    );

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Delete any existing reset tokens for this user
    await database.execute(
      'DELETE FROM email_tokens WHERE user_id = $1 AND type = $2',
      [user.id, 'reset']
    );

    // Store reset token
    await database.execute(
      'INSERT INTO email_tokens (user_id, token, type, expires_at) VALUES ($1, $2, $3, $4)',
      [user.id, resetToken, 'reset', expiresAt]
    );

    // Send reset email
    const resetUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/reset-password` : null;
    const emailResult = await emailService.sendPasswordResetEmail(user.email, resetToken, resetUrl);

    if (!emailResult.success) {
      logger.error('Failed to send password reset email:', emailResult.error);
      // Don't expose email service errors to user
    }

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    logger.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Reset Password with Token
router.post('/reset-password', resetPasswordValidation, async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Find valid reset token
    const tokenRecord = await database.get(
      `SELECT et.*, u.email, u.first_name 
       FROM email_tokens et 
       JOIN users u ON et.user_id = u.id 
       WHERE et.token = $1 AND et.type = $2 AND et.expires_at > datetime('now') AND et.used_at IS NULL`,
      [token, 'reset']
    );

    if (!tokenRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await database.execute(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, tokenRecord.user_id]
    );

    // Mark token as used
    await database.execute(
      'UPDATE email_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [tokenRecord.id]
    );

    // Delete all reset tokens for this user
    await database.execute(
      'DELETE FROM email_tokens WHERE user_id = $1 AND type = $2',
      [tokenRecord.user_id, 'reset']
    );

    res.json({
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Verify Reset Token
router.post('/verify-reset-token', verifyResetTokenValidation, async (req, res) => {
  const { token } = req.body;

  try {
    const tokenRecord = await database.get(
      `SELECT et.*, u.email 
       FROM email_tokens et 
       JOIN users u ON et.user_id = u.id 
       WHERE et.token = $1 AND et.type = $2 AND et.expires_at > datetime('now') AND et.used_at IS NULL`,
      [token, 'reset']
    );

    if (!tokenRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    res.json({
      message: 'Token is valid',
      email: tokenRecord.email
    });
  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

// Send Email Verification
router.post('/send-verification-email', authenticateUser, async (req, res) => {
  const userId = req.user.id;

  try {
    // Check if email is already verified
    const user = await database.get(
      'SELECT id, email, email_verified, first_name FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.email_verified) {
      return res.json({
        message: 'Email is already verified'
      });
    }

    // Generate verification token
    const verificationToken = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Delete any existing verification tokens for this user
    await database.execute(
      'DELETE FROM email_tokens WHERE user_id = $1 AND type = $2',
      [userId, 'verification']
    );

    // Store verification token
    await database.execute(
      'INSERT INTO email_tokens (user_id, token, type, expires_at) VALUES ($1, $2, $3, $4)',
      [userId, verificationToken, 'verification', expiresAt]
    );

    // Send verification email
    const verificationUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/verify-email` : null;
    const emailResult = await emailService.sendVerificationEmail(user.email, verificationToken, verificationUrl);

    if (!emailResult.success) {
      logger.error('Failed to send verification email:', emailResult.error);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    res.json({
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    logger.error('Send verification email error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// Verify Email with Token
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  try {
    // Find valid verification token
    const dbType = database.getType ? database.getType() : (process.env.DB_CLIENT || 'sqlite3');
    const isPostgres = dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql';
    
    let tokenRecord;
    if (isPostgres) {
      tokenRecord = await database.get(
        `SELECT et.*, u.email, u.email_verified 
         FROM email_tokens et 
         JOIN users u ON et.user_id = u.id 
         WHERE et.token = $1 AND et.type = $2 AND et.expires_at > NOW() AND et.used_at IS NULL`,
        [token, 'verification']
      );
    } else {
      tokenRecord = await database.get(
        `SELECT et.*, u.email, u.email_verified 
         FROM email_tokens et 
         JOIN users u ON et.user_id = u.id 
         WHERE et.token = $1 AND et.type = $2 AND et.expires_at > datetime('now') AND et.used_at IS NULL`,
        [token, 'verification']
      );
    }

    if (!tokenRecord) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    if (tokenRecord.email_verified) {
      return res.json({
        message: 'Email is already verified'
      });
    }

    // Mark email as verified
    await database.execute(
      'UPDATE users SET email_verified = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [tokenRecord.user_id]
    );

    // Mark token as used
    await database.execute(
      'UPDATE email_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [tokenRecord.id]
    );

    // Delete all verification tokens for this user
    await database.execute(
      'DELETE FROM email_tokens WHERE user_id = $1 AND type = $2',
      [tokenRecord.user_id, 'verification']
    );

    res.json({
      message: 'Email verified successfully'
    });
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Logout (invalidate token - in a real app, you'd maintain a blacklist)
router.post('/logout', (req, res) => {
  res.json({
    message: 'Logged out successfully'
  });
});

// Admin Logout
router.post('/admin/logout', (req, res) => {
  res.json({
    message: 'Admin logged out successfully'
  });
});

module.exports = router;
