const express = require('express');
const { database } = require('../database');
const {
  hashPassword,
  comparePassword,
  formatUserResponse,
  formatAdminResponse
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
  adminLoginValidation
} = require('../middleware/validation');
const {
  ConflictError,
  UnauthorizedError,
  NotFoundError
} = require('../middleware/errorHandler');

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

// Refresh Token
router.post('/refresh', async (req, res) => {
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
