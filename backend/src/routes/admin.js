const express = require('express');
const { database } = require('../database');
const { adapter } = require('../database/adapter');
const { authenticateAdmin, requireSuperAdmin } = require('../middleware/auth');
const { paginationValidation, idValidation } = require('../middleware/validation');
const { hashPassword, formatAdminResponse } = require('../utils/auth');
const { NotFoundError } = require('../middleware/errorHandler');

const router = express.Router();

// Dashboard statistics
router.get('/dashboard/stats', authenticateAdmin, async (req, res) => {
  const period = parseInt(req.query.period) || 30; // days
  const periodDays = period.toString();
  const period2x = (period * 2).toString();

  // Get overview stats
  const dateComparison = adapter.getDateComparison('created_at', '>=');
  const stats = await database.get(`
    SELECT
      (SELECT COUNT(*) FROM products WHERE status = 'active') as total_products,
      (SELECT COUNT(*) FROM orders WHERE ${dateComparison}) as total_orders,
      (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_users,
      (SELECT COALESCE(SUM(total), 0) FROM orders WHERE ${dateComparison}) as total_revenue,
      (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
      (SELECT COUNT(*) FROM products WHERE stock <= min_stock AND status = 'active') as low_stock_products
  `, [periodDays, periodDays]);

  // Growth calculations (compare with previous period)
  const dateRange = adapter.getDateRange('created_at');
  const previousStats = await database.get(`
    SELECT
      (SELECT COUNT(*) FROM orders WHERE ${dateRange}) as prev_orders,
      (SELECT COALESCE(SUM(total), 0) FROM orders WHERE ${dateRange}) as prev_revenue,
      (SELECT COUNT(*) FROM users WHERE ${dateRange}) as prev_users
  `, [period2x, periodDays, period2x, periodDays, period2x, periodDays]);

  // Get current period new users
  const userDateComparison = adapter.getDateComparison('created_at', '>=');
  const currentPeriodUsers = await database.get(`
    SELECT COUNT(*) as new_users
    FROM users
    WHERE ${userDateComparison}
  `, [periodDays]);

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
      usersGrowth: calculateGrowth(currentPeriodUsers.new_users, previousStats.prev_users)
    }
  });
});

// Recent orders for dashboard
router.get('/dashboard/recent-orders', authenticateAdmin, async (req, res) => {
  const { limit = 10 } = req.query;

  const orders = await database.query(`
    SELECT
      id,
      order_number,
      COALESCE(billing_first_name || ' ' || billing_last_name, email) as customer_name,
      email,
      total,
      status,
      payment_status,
      created_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT ?
  `, [parseInt(limit)]);

  res.json({ orders });
});

// Top products for dashboard
router.get('/dashboard/top-products', authenticateAdmin, async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const period = parseInt(req.query.period) || 30;
  const periodDays = period.toString();

  const orderDateComparison = adapter.getDateComparison('o.created_at', '>=');
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
    LEFT JOIN orders o ON oi.order_id = o.id AND ${orderDateComparison}
    WHERE p.status = 'active'
    GROUP BY p.id, p.name, p.price, p.featured_image, c.name
    ORDER BY units_sold DESC, revenue DESC
    LIMIT ?
  `, [periodDays, limit]);

  res.json({
    products: products.map(p => ({
      ...p,
      revenue: Math.round(p.revenue * 100) / 100
    }))
  });
});

// Daily sales data for charts
router.get('/dashboard/sales-data', authenticateAdmin, async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const daysStr = days.toString();

  const salesDateComparison = adapter.getDateComparison('created_at', '>=');
  const salesData = await database.query(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as orders_count,
      COALESCE(SUM(total), 0) as revenue
    FROM orders
    WHERE ${salesDateComparison}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `, [daysStr]);

  res.json({
    salesData: salesData.map(day => ({
      date: day.date,
      orders: day.orders_count,
      revenue: Math.round(day.revenue * 100) / 100
    }))
  });
});

// Category performance
router.get('/dashboard/category-performance', authenticateAdmin, async (req, res) => {
  const period = parseInt(req.query.period) || 30;
  const periodDays = period.toString();

  const categoryDateComparison = adapter.getDateComparison('o.created_at', '>=');
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
    LEFT JOIN orders o ON oi.order_id = o.id AND ${categoryDateComparison}
    WHERE c.is_active = TRUE
    GROUP BY c.id, c.name
    ORDER BY revenue DESC
  `, [periodDays]);

  res.json({
    categories: categoryStats.map(cat => ({
      ...cat,
      revenue: Math.round(cat.revenue * 100) / 100
    }))
  });
});

// Get users list (public for admin portal)
router.get('/users', paginationValidation, async (req, res) => {
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
      id, email, first_name, last_name, phone, avatar,
      email_verified, is_active, created_at, updated_at,
      (SELECT COUNT(*) FROM orders WHERE user_id = users.id) as order_count,
      (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = users.id) as total_spent
    FROM users
    ${whereClause}
    ORDER BY ${sortColumn} ${sortDirection}
    LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), offset]);

  const [{ total }] = await database.query(`
    SELECT COUNT(*) as total FROM users ${whereClause}
  `, params);

  res.json({
    users: users.map(user => ({
      ...user,
      total_spent: Math.round(user.total_spent * 100) / 100
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  });
});

// User management (Super Admin only)
router.get('/users/authenticated', authenticateAdmin, requireSuperAdmin, paginationValidation, async (req, res) => {
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
    whereConditions.push('u.is_active = ?');
    params.push(status === 'active');
  }

  // Search filter
  if (search) {
    whereConditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)');
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
      END as role,
      (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count,
      (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = u.id) as total_spent
    FROM users u
    LEFT JOIN admins a ON u.email = a.email
    ${whereClause}
    ORDER BY u.${sortColumn} ${sortDirection}
    LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), offset]);

  const [{ total }] = await database.query(`
    SELECT COUNT(*) as total FROM users u ${whereClause}
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
      updatedAt: user.updated_at,
      orderCount: user.order_count,
      totalSpent: Math.round(user.total_spent * 100) / 100
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  });
});

// User details (Super Admin only)
router.get('/users/:id', authenticateAdmin, requireSuperAdmin, idValidation, async (req, res) => {
  const userId = req.params.id;

  const user = await database.get(`
    SELECT
      id, email, first_name, last_name, phone, avatar,
      email_verified, is_active, created_at, updated_at
    FROM users
    WHERE id = ?
  `, [userId]);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Get user's orders
  const orders = await database.query(`
    SELECT id, order_number, total, status, created_at
    FROM orders
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 10
  `, [userId]);

  // Get user stats
  const [stats] = await database.query(`
    SELECT
      COUNT(*) as order_count,
      COALESCE(SUM(total), 0) as total_spent,
      COALESCE(AVG(total), 0) as avg_order_value
    FROM orders
    WHERE user_id = ?
  `, [userId]);

  res.json({
    user,
    stats: {
      orderCount: stats.order_count,
      totalSpent: Math.round(stats.total_spent * 100) / 100,
      avgOrderValue: Math.round(stats.avg_order_value * 100) / 100
    },
    recentOrders: orders
  });
});

// Toggle user status (Super Admin only)
router.put('/users/:id/toggle-status', authenticateAdmin, requireSuperAdmin, idValidation, async (req, res) => {
  const userId = req.params.id;

  const user = await database.get('SELECT id, is_active FROM users WHERE id = ?', [userId]);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const newStatus = !user.is_active;

  await database.execute(
    'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [newStatus, userId]
  );

  res.json({
    message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
    isActive: newStatus
  });
});

// Admin management (Super Admin only)
router.get('/admins', authenticateAdmin, requireSuperAdmin, paginationValidation, async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '';
  let params = [];

  if (search) {
    whereClause = 'WHERE (name LIKE ? OR email LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  const admins = await database.query(`
    SELECT id, email, name, role, avatar, is_active, last_login, created_at
    FROM admins
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), offset]);

  const [{ total }] = await database.query(`
    SELECT COUNT(*) as total FROM admins ${whereClause}
  `, params);

  res.json({
    admins,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  });
});

// Create admin (Super Admin only)
router.post('/admins', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  const { email, password, name, role = 'admin' } = req.body;

  // Check if admin already exists
  const existingAdmin = await database.get('SELECT id FROM admins WHERE email = ?', [email]);
  if (existingAdmin) {
    return res.status(409).json({ error: 'Admin with this email already exists' });
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create admin
  const result = await database.execute(
    'INSERT INTO admins (email, password, name, role) VALUES (?, ?, ?, ?)',
    [email, hashedPassword, name, role]
  );

  const admin = await database.get(
    'SELECT id, email, name, role, is_active, created_at FROM admins WHERE id = ?',
    [result.id]
  );

  res.status(201).json({
    message: 'Admin created successfully',
    admin: formatAdminResponse(admin)
  });
});

// Update admin (Super Admin only)
router.put('/admins/:id', authenticateAdmin, requireSuperAdmin, idValidation, async (req, res) => {
  const adminId = req.params.id;
  const { name, role, isActive } = req.body;

  const admin = await database.get('SELECT id FROM admins WHERE id = ?', [adminId]);
  if (!admin) {
    throw new NotFoundError('Admin not found');
  }

  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }

  if (role !== undefined) {
    updates.push('role = ?');
    params.push(role);
  }

  if (isActive !== undefined) {
    updates.push('is_active = ?');
    params.push(isActive);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(adminId);

  await database.execute(
    `UPDATE admins SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  const updatedAdmin = await database.get(
    'SELECT id, email, name, role, is_active, created_at, updated_at FROM admins WHERE id = ?',
    [adminId]
  );

  res.json({
    message: 'Admin updated successfully',
    admin: formatAdminResponse(updatedAdmin)
  });
});

// Delete admin (Super Admin only)
router.delete('/admins/:id', authenticateAdmin, requireSuperAdmin, idValidation, async (req, res) => {
  const adminId = req.params.id;

  // Prevent deleting self
  if (parseInt(adminId) === req.admin.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  const admin = await database.get('SELECT id FROM admins WHERE id = ?', [adminId]);
  if (!admin) {
    throw new NotFoundError('Admin not found');
  }

  await database.execute('DELETE FROM admins WHERE id = ?', [adminId]);

  res.json({ message: 'Admin deleted successfully' });
});

// System health check
router.get('/system/health', authenticateAdmin, async (req, res) => {
  const dbStatus = await database.get('SELECT 1 as status');

  // Get database size
  const [dbInfo] = await database.query("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()");

  // Get table counts
  const tableCounts = await database.query(`
    SELECT
      'users' as table_name, COUNT(*) as count FROM users
    UNION ALL
    SELECT 'products', COUNT(*) FROM products
    UNION ALL
    SELECT 'orders', COUNT(*) FROM orders
    UNION ALL
    SELECT 'categories', COUNT(*) FROM categories
  `);

  res.json({
    status: 'healthy',
    database: {
      connected: !!dbStatus,
      size: Math.round(dbInfo.size / 1024 / 1024 * 100) / 100, // MB
      tables: tableCounts.reduce((acc, row) => {
        acc[row.table_name] = row.count;
        return acc;
      }, {})
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Get public settings (store and appearance only - no authentication required)
router.get('/settings/public', async (req, res) => {
  try {
    const publicSections = ['store', 'appearance'];
    const placeholders = publicSections.map(() => '?').join(',');
    const settingsRows = await database.query(
      `SELECT section, data FROM settings WHERE section IN (${placeholders})`,
      publicSections
    );
    
    // Convert database rows to settings object
    const settings = {};
    settingsRows.forEach(row => {
      try {
        // Parse JSON data (handle both SQLite TEXT and PostgreSQL JSONB)
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        settings[row.section] = data;
      } catch (err) {
        console.error(`Error parsing settings for section ${row.section}:`, err);
      }
    });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching public settings:', error);
    // Return empty settings if error (first time setup)
    res.json({});
  }
});

// Get all settings (Super Admin only)
router.get('/settings', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const settingsRows = await database.query('SELECT section, data FROM settings');
    
    // Convert database rows to settings object
    const settings = {};
    settingsRows.forEach(row => {
      try {
        // Parse JSON data (handle both SQLite TEXT and PostgreSQL JSONB)
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        settings[row.section] = data;
      } catch (err) {
        console.error(`Error parsing settings for section ${row.section}:`, err);
      }
    });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get specific settings section (Super Admin only)
router.get('/settings/:section', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  const { section } = req.params;

  try {
    const row = await database.get('SELECT data FROM settings WHERE section = ?', [section]);
    
    if (!row) {
      return res.status(404).json({ error: 'Settings section not found' });
    }

    // Parse JSON data
    const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    res.json(data);
  } catch (error) {
    console.error(`Error fetching settings for section ${section}:`, error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings section (Super Admin only)
router.put('/settings/:section', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  const { section } = req.params;
  const data = req.body;

  // Validate section name
  const validSections = ['store', 'email', 'payment', 'shipping', 'appearance', 'notifications', 'security'];
  if (!validSections.includes(section)) {
    return res.status(400).json({ error: 'Invalid settings section' });
  }

  try {
    // Get database type from the database instance
    const dbType = typeof database.getType === 'function' ? database.getType() : 'sqlite3';
    const isPostgres = dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql';
    
    // Prepare data for storage
    // PostgreSQL accepts JSON objects directly, SQLite needs stringified JSON
    const dataToStore = isPostgres ? data : JSON.stringify(data);
    
    // Check if settings exist
    const existing = await database.get('SELECT id FROM settings WHERE section = ?', [section]);
    
    if (existing) {
      // Update existing settings
      // Use CAST for PostgreSQL to ensure JSONB type
      if (isPostgres) {
        // For PostgreSQL, we need to use CAST in the SQL
        // The adapter will convert ? to $1, $2, etc.
        await database.execute(
          'UPDATE settings SET data = CAST(? AS jsonb), updated_at = CURRENT_TIMESTAMP WHERE section = ?',
          [JSON.stringify(data), section]
        );
      } else {
        await database.execute(
          'UPDATE settings SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE section = ?',
          [dataToStore, section]
        );
      }
    } else {
      // Insert new settings
      if (isPostgres) {
        await database.execute(
          'INSERT INTO settings (section, data) VALUES (?, CAST(? AS jsonb))',
          [section, JSON.stringify(data)]
        );
      } else {
        await database.execute(
          'INSERT INTO settings (section, data) VALUES (?, ?)',
          [section, dataToStore]
        );
      }
    }

    res.json({ message: 'Settings updated successfully', section, data });
  } catch (error) {
    console.error(`Error updating settings for section ${section}:`, error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
