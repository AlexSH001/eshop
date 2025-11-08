const express = require('express');
const { database } = require('../database');
const { authenticateAdmin, requirePermission } = require('../middleware/auth');
const { paginationValidation, idValidation } = require('../middleware/validation');
const { hashPassword, formatAdminResponse } = require('../utils/auth');
const { NotFoundError } = require('../middleware/errorHandler');
const { 
  getAllPermissions, 
  getRolePermissions, 
  invalidatePermissionsCache,
  defaultPermissions 
} = require('../config/permissions');

const router = express.Router();

// Dashboard statistics
router.get('/dashboard/stats', authenticateAdmin, requirePermission('dashboard.view'), async (req, res) => {
  const { period = '30' } = req.query; // days

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
      usersGrowth: calculateGrowth(0, previousStats.prev_users) // New users in current period vs previous
    }
  });
});

// Recent orders for dashboard
router.get('/dashboard/recent-orders', authenticateAdmin, requirePermission('dashboard.view'), async (req, res) => {
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
router.get('/dashboard/top-products', authenticateAdmin, requirePermission('dashboard.view'), async (req, res) => {
  const { limit = 10, period = '30' } = req.query;

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
});

// Daily sales data for charts
router.get('/dashboard/sales-data', authenticateAdmin, requirePermission('dashboard.view'), async (req, res) => {
  const { days = '30' } = req.query;

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
});

// Category performance
router.get('/dashboard/category-performance', authenticateAdmin, requirePermission('dashboard.view'), async (req, res) => {
  const { period = '30' } = req.query;

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

// User management (authenticated)
router.get('/users/authenticated', authenticateAdmin, requirePermission('users.view'), paginationValidation, async (req, res) => {
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

// User details
router.get('/users/:id', authenticateAdmin, requirePermission('users.view'), idValidation, async (req, res) => {
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

// Toggle user status
router.put('/users/:id/toggle-status', authenticateAdmin, requirePermission('users.toggle_status'), idValidation, async (req, res) => {
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
router.get('/admins', authenticateAdmin, requirePermission('admins.view'), paginationValidation, async (req, res) => {
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
router.post('/admins', authenticateAdmin, requirePermission('admins.create'), async (req, res) => {
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
router.put('/admins/:id', authenticateAdmin, requirePermission('admins.update'), idValidation, async (req, res) => {
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
router.delete('/admins/:id', authenticateAdmin, requirePermission('admins.delete'), idValidation, async (req, res) => {
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
router.get('/system/health', authenticateAdmin, requirePermission('system.health'), async (req, res) => {
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

// Get all available permissions
router.get('/permissions/all', authenticateAdmin, requirePermission('settings.view'), async (req, res) => {
  try {
    const allPermissions = getAllPermissions();
    
    // Group permissions by category
    const grouped = {};
    allPermissions.forEach(perm => {
      const [category] = perm.split('.');
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(perm);
    });

    res.json({
      permissions: allPermissions,
      grouped,
      categories: Object.keys(grouped)
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Get permissions for a specific role
router.get('/permissions/role/:role', authenticateAdmin, requirePermission('settings.view'), async (req, res) => {
  try {
    const { role } = req.params;
    
    if (!['admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const permissions = await getRolePermissions(role);
    const allPermissions = getAllPermissions();
    
    // Return permissions with all available keys (showing which are enabled/disabled)
    const permissionsWithStatus = allPermissions.map(key => ({
      key,
      allowed: permissions[key] === true
    }));

    res.json({
      role,
      permissions: permissionsWithStatus
    });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

// Update permissions for a role
router.put('/permissions/role/:role', authenticateAdmin, requirePermission('settings.update'), async (req, res) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    if (!['admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ error: 'Permissions must be an object' });
    }

    // Validate permission keys against available permissions
    const allPermissions = getAllPermissions();
    const invalidKeys = Object.keys(permissions).filter(key => !allPermissions.includes(key));
    if (invalidKeys.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid permission keys', 
        invalidKeys 
      });
    }

    // Update permissions in database
    await database.beginTransaction();
    
    try {
      for (const [permissionKey, isAllowed] of Object.entries(permissions)) {
        const isAllowedBool = isAllowed === true || isAllowed === 'true' || isAllowed === 1;
        
        // Check if permission exists
        const existing = await database.get(
          'SELECT id FROM role_permissions WHERE role = ? AND permission_key = ?',
          [role, permissionKey]
        );

        if (existing) {
          // Update existing
          await database.execute(
            'UPDATE role_permissions SET is_allowed = ?, updated_at = CURRENT_TIMESTAMP WHERE role = ? AND permission_key = ?',
            [isAllowedBool, role, permissionKey]
          );
        } else {
          // Insert new
          await database.execute(
            'INSERT INTO role_permissions (role, permission_key, is_allowed) VALUES (?, ?, ?)',
            [role, permissionKey, isAllowedBool]
          );
        }
      }

      await database.commit();
      
      // Invalidate cache
      invalidatePermissionsCache();

      res.json({
        message: 'Permissions updated successfully',
        role,
        updated: Object.keys(permissions).length
      });
    } catch (error) {
      await database.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

// Reset permissions to defaults for a role
router.post('/permissions/role/:role/reset', authenticateAdmin, requirePermission('settings.update'), async (req, res) => {
  try {
    const { role } = req.params;
    
    if (!['admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Delete all permissions for this role
    await database.execute(
      'DELETE FROM role_permissions WHERE role = ?',
      [role]
    );

    // Invalidate cache
    invalidatePermissionsCache();

    res.json({
      message: 'Permissions reset to defaults successfully',
      role
    });
  } catch (error) {
    console.error('Error resetting permissions:', error);
    res.status(500).json({ error: 'Failed to reset permissions' });
  }
});

module.exports = router;
