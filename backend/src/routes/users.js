const express = require('express');
const { database } = require('../database/init');
const { authenticateAdmin } = require('../middleware/auth');
const { paginationValidation, idValidation } = require('../middleware/validation');
const { hashPassword } = require('../utils/auth');
const { NotFoundError } = require('../middleware/errorHandler');

const router = express.Router();

// Public analytics endpoints for admin portal
router.get('/analytics/stats', async (req, res) => {
  const { period = '30' } = req.query; // days

  try {
    // Get overview stats
    const stats = await database.get(`
      SELECT
        (SELECT COUNT(*) FROM products WHERE status = 'active') as total_products,
        (SELECT COUNT(*) FROM orders WHERE created_at >= datetime('now', '-${period} days')) as total_orders,
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_users,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE created_at >= datetime('now', '-${period} days')) as total_revenue,
        (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
        (SELECT COUNT(*) FROM products WHERE stock <= min_stock AND status = 'active') as low_stock_products
    `);

    // Growth calculations (compare with previous period)
    const previousStats = await database.get(`
      SELECT
        (SELECT COUNT(*) FROM orders WHERE created_at BETWEEN datetime('now', '-${period * 2} days') AND datetime('now', '-${period} days')) as prev_orders,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE created_at BETWEEN datetime('now', '-${period * 2} days') AND datetime('now', '-${period} days')) as prev_revenue,
        (SELECT COUNT(*) FROM users WHERE created_at BETWEEN datetime('now', '-${period * 2} days') AND datetime('now', '-${period} days')) as prev_users
    `);

    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100 * 100) / 100;
    };

    res.json({
      overview: {
        totalProducts: stats.total_products,
        totalOrders: stats.total_orders,
        totalUsers: stats.total_users,
        totalRevenue: Math.round(stats.total_revenue * 100) / 100,
        pendingOrders: stats.pending_orders,
        lowStockProducts: stats.low_stock_products
      },
      growth: {
        ordersGrowth: calculateGrowth(stats.total_orders, previousStats.prev_orders),
        revenueGrowth: calculateGrowth(stats.total_revenue, previousStats.prev_revenue),
        usersGrowth: calculateGrowth(0, previousStats.prev_users)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics stats' });
  }
});

router.get('/analytics/sales-data', async (req, res) => {
  const { days = '30' } = req.query;

  try {
    const salesData = await database.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as orders_count,
        COALESCE(SUM(total), 0) as revenue
      FROM orders
      WHERE created_at >= datetime('now', '-${days} days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json({
      salesData: salesData.map(day => ({
        date: day.date,
        orders: day.orders_count,
        revenue: Math.round(day.revenue * 100) / 100
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales data' });
  }
});

router.get('/analytics/top-products', async (req, res) => {
  const { limit = 10, period = '30' } = req.query;

  try {
    const products = await database.query(`
      SELECT
        p.id,
        p.name,
        p.price,
        p.featured_image,
        c.name as category_name,
        COALESCE(SUM(oi.quantity), 0) as units_sold,
        COALESCE(SUM(oi.total), 0) as revenue
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= datetime('now', '-${period} days')
      WHERE p.status = 'active'
      GROUP BY p.id
      ORDER BY units_sold DESC, revenue DESC
      LIMIT ?
    `, [parseInt(limit)]);

    res.json({
      products: products.map(p => ({
        ...p,
        revenue: Math.round(p.revenue * 100) / 100
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch top products' });
  }
});

router.get('/analytics/category-performance', async (req, res) => {
  const { period = '30' } = req.query;

  try {
    const categoryStats = await database.query(`
      SELECT
        c.id,
        c.name,
        COUNT(DISTINCT p.id) as product_count,
        COALESCE(SUM(oi.quantity), 0) as units_sold,
        COALESCE(SUM(oi.total), 0) as revenue
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active'
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= datetime('now', '-${period} days')
      WHERE c.is_active = TRUE
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
    `);

    res.json({
      categories: categoryStats.map(cat => ({
        ...cat,
        revenue: Math.round(cat.revenue * 100) / 100
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch category performance' });
  }
});

// Get users list (public for admin portal)
router.get('/', paginationValidation, async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    status = 'all',
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = req.query;

  const offset = (page - 1) * limit;

  let whereConditions = [];
  let params = [];

  // Status filter
  if (status !== 'all') {
    whereConditions.push('is_active = ?');
    params.push(status === 'active');
  }

  // Search filter
  if (search) {
    whereConditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Validate sort
  const validSortColumns = ['first_name', 'last_name', 'email', 'created_at'];
  const validSortOrder = ['ASC', 'DESC'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const sortDirection = validSortOrder.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

  const users = await database.query(`
    SELECT
      u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar,
      u.email_verified, u.is_active, u.created_at, u.updated_at,
      CASE 
        WHEN a.id IS NOT NULL THEN 'admin'
        ELSE 'user'
      END as role
    FROM users u
    LEFT JOIN admins a ON u.email = a.email
    ${whereClause}
    ORDER BY u.${sortColumn} ${sortDirection}
    LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), offset]);

  // Get total count
  const countResult = await database.get(`
    SELECT COUNT(*) as total
    FROM users u
    LEFT JOIN admins a ON u.email = a.email
    ${whereClause}
  `, params);

  res.json({
    users: users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      avatar: user.avatar,
      emailVerified: user.email_verified,
      isActive: user.is_active,
      role: user.role,
      status: user.is_active ? 'active' : 'inactive',
      createdAt: user.created_at,
      updatedAt: user.updated_at
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult.total,
      pages: Math.ceil(countResult.total / limit)
    }
  });
});

// Create user
router.post('/', async (req, res) => {
  const {
    email,
    firstName,
    lastName,
    password,
    role = 'user',
    status = 'active'
  } = req.body;

  // Validate required fields
  if (!email || !firstName || !lastName || !password) {
    return res.status(400).json({
      error: 'Missing required fields: email, firstName, lastName, password'
    });
  }

  // Check if user already exists
  const existingUser = await database.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existingUser) {
    return res.status(400).json({
      error: 'User with this email already exists'
    });
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Insert user
  const result = await database.execute(`
    INSERT INTO users (email, first_name, last_name, password, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [email, firstName, lastName, hashedPassword, status === 'active']);

  const newUser = await database.get(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, u.created_at,
           CASE WHEN a.id IS NOT NULL THEN 'admin' ELSE 'user' END as role
    FROM users u
    LEFT JOIN admins a ON u.email = a.email
    WHERE u.id = ?
  `, [result.id]);

  res.status(201).json({
    message: 'User created successfully',
    user: {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      role: newUser.role,
      status: newUser.is_active ? 'active' : 'inactive',
      createdAt: newUser.created_at
    }
  });
});

// Update user (public for admin portal)
router.put('/:id', idValidation, async (req, res) => {
  const { id } = req.params;
  const {
    email,
    firstName,
    lastName,
    password,
    role,
    status
  } = req.body;

  // Check if user exists
  const existingUser = await database.get('SELECT id FROM users WHERE id = ?', [id]);
  if (!existingUser) {
    throw new NotFoundError('User not found');
  }

  // Check if email is being changed and if it's already taken
  if (email) {
    const emailCheck = await database.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
    if (emailCheck) {
      return res.status(400).json({
        error: 'Email is already taken by another user'
      });
    }
  }

  // Build update query
  const updates = [];
  const params = [];

  if (email) {
    updates.push('email = ?');
    params.push(email);
  }
  if (firstName) {
    updates.push('first_name = ?');
    params.push(firstName);
  }
  if (lastName) {
    updates.push('last_name = ?');
    params.push(lastName);
  }
  if (password) {
    const hashedPassword = await hashPassword(password);
    updates.push('password = ?');
    params.push(hashedPassword);
  }
  // Note: Role updates would need to be handled separately for admins table
  // For now, we'll skip role updates in the users table
  if (status !== undefined) {
    updates.push('is_active = ?');
    params.push(status === 'active');
  }

  updates.push('updated_at = datetime("now")');
  params.push(id);

  await database.execute(`
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = ?
  `, params);

  const updatedUser = await database.get(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, u.updated_at,
           CASE WHEN a.id IS NOT NULL THEN 'admin' ELSE 'user' END as role
    FROM users u
    LEFT JOIN admins a ON u.email = a.email
    WHERE u.id = ?
  `, [id]);

  res.json({
    message: 'User updated successfully',
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      role: updatedUser.role,
      status: updatedUser.is_active ? 'active' : 'inactive',
      updatedAt: updatedUser.updated_at
    }
  });
});

// Delete user (public for admin portal)
router.delete('/:id', idValidation, async (req, res) => {
  const { id } = req.params;

  // Check if user exists
  const existingUser = await database.get('SELECT id FROM users WHERE id = ?', [id]);
  if (!existingUser) {
    throw new NotFoundError('User not found');
  }

  // Check if user has orders
  const orderCheck = await database.get('SELECT id FROM orders WHERE user_id = ? LIMIT 1', [id]);
  if (orderCheck) {
    return res.status(400).json({
      error: 'Cannot delete user with existing orders'
    });
  }

  await database.execute('DELETE FROM users WHERE id = ?', [id]);

  res.json({
    message: 'User deleted successfully'
  });
});

module.exports = router; 