const jwt = require('jsonwebtoken');
const { database } = require('../database');
const { hasPermission } = require('../config/permissions');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Validate secrets are set
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT secrets must be configured in production');
}

if (process.env.NODE_ENV === 'production' && 
    (JWT_SECRET.length < 32 || JWT_REFRESH_SECRET.length < 32)) {
  throw new Error('JWT secrets must be at least 32 characters in production');
}

// Generate access token (short-lived)
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
};

// Generate refresh token (long-lived)
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

// Verify access token
const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

// Middleware to authenticate users
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = verifyAccessToken(token);

    // Verify user still exists and is active
    const user = await database.get(
      'SELECT id, email, first_name, last_name, phone, avatar, is_active FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid access token' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Middleware to authenticate admins
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = verifyAccessToken(token);

    // Verify admin exists and is active
    const admin = await database.get(
      'SELECT id, email, name, role, avatar, is_active FROM admins WHERE id = ? AND is_active = TRUE',
      [decoded.adminId]
    );

    if (!admin) {
      return res.status(401).json({ error: 'Admin not found or inactive' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid access token' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Check if user is super admin
const requireSuperAdmin = (req, res, next) => {
  if (!req.admin || req.admin.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

/**
 * Middleware to check if admin has a specific permission
 * Must be used after authenticateAdmin middleware
 * @param {string} permission - The permission key to check (e.g., 'products.create')
 * @returns {Function} - Express middleware function
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const role = req.admin.role;
    const hasPerm = await hasPermission(role, permission);
    if (!hasPerm) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission,
        role: role
      });
    }

    next();
  };
};

// Optional authentication - sets user if token is provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    const decoded = verifyAccessToken(token);
    const user = await database.get(
      'SELECT id, email, first_name, last_name, phone, avatar, is_active FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    );

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  authenticateUser,
  authenticateAdmin,
  requireSuperAdmin,
  requirePermission,
  optionalAuth
};
