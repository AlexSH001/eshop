const express = require('express');
const { database } = require('../database');
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');
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
    whereConditions.push('is_active = $1');
    params.push(status === 'active');
  }

  // Search filter
  if (search) {
    whereConditions.push('(first_name LIKE $2 OR last_name LIKE $3 OR email LIKE $4)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
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
    LIMIT $1 OFFSET $2
  `, [parseInt(limit), offset]);

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
  const existingUser = await database.get('SELECT id FROM users WHERE email = $1', [email]);
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
    VALUES ($1, $2, $3, $4, $5, datetime('now'), datetime('now'))
  `, [email, firstName, lastName, hashedPassword, status === 'active']);

  const newUser = await database.get(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, u.created_at,
           CASE WHEN a.id IS NOT NULL THEN 'admin' ELSE 'user' END as role
    FROM users u
    LEFT JOIN admins a ON u.email = a.email
    WHERE u.id = $1
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
  const existingUser = await database.get('SELECT id FROM users WHERE id = $1', [id]);
  if (!existingUser) {
    throw new NotFoundError('User not found');
  }

  // Check if email is being changed and if it's already taken
  if (email) {
    const emailCheck = await database.get('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
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
    updates.push('email = $1');
    params.push(email);
  }
  if (firstName) {
    updates.push('first_name = $1');
    params.push(firstName);
  }
  if (lastName) {
    updates.push('last_name = $1');
    params.push(lastName);
  }
  if (password) {
    const hashedPassword = await hashPassword(password);
    updates.push('password = $1');
    params.push(hashedPassword);
  }
  // Note: Role updates would need to be handled separately for admins table
  // For now, we'll skip role updates in the users table
  if (status !== undefined) {
    updates.push('is_active = $1');
    params.push(status === 'active');
  }

  updates.push('updated_at = datetime("now")');
  params.push(id);

  await database.execute(`
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = $1
  `, params);

  const updatedUser = await database.get(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, u.updated_at,
           CASE WHEN a.id IS NOT NULL THEN 'admin' ELSE 'user' END as role
    FROM users u
    LEFT JOIN admins a ON u.email = a.email
    WHERE u.id = $1
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
  const existingUser = await database.get('SELECT id FROM users WHERE id = $1', [id]);
  if (!existingUser) {
    throw new NotFoundError('User not found');
  }

  // Check if user has orders
  const orderCheck = await database.get('SELECT id FROM orders WHERE user_id = $1 LIMIT 1', [id]);
  if (orderCheck) {
    return res.status(400).json({
      error: 'Cannot delete user with existing orders'
    });
  }

  await database.execute('DELETE FROM users WHERE id = $1', [id]);

  res.json({
    message: 'User deleted successfully'
  });
});

// Get user addresses
router.get('/addresses', authenticateUser, async (req, res) => {
  const userId = req.user.id;

  try {
    const addresses = await database.query(`
      SELECT * FROM user_addresses 
      WHERE user_id = $1 
      ORDER BY is_default DESC, created_at DESC
    `, [userId]);

    res.json({
      addresses: addresses.map(addr => ({
        id: addr.id,
        type: addr.type,
        firstName: addr.first_name,
        lastName: addr.last_name,
        company: addr.company,
        addressLine1: addr.address_line_1,
        addressLine2: addr.address_line_2,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postal_code,
        country: addr.country,
        phone: addr.phone,
        isDefault: addr.is_default,
        createdAt: addr.created_at,
        updatedAt: addr.updated_at
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// Create user address
router.post('/addresses', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const {
    type = 'shipping',
    firstName,
    lastName,
    company,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country = 'US',
    phone,
    isDefault = false
  } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !addressLine1 || !city || !state || !postalCode) {
    return res.status(400).json({
      error: 'Missing required fields: firstName, lastName, addressLine1, city, state, postalCode'
    });
  }

  try {
    // Use transaction wrapper to handle both SQLite and PostgreSQL
    const dbType = database.getType() || process.env.DB_CLIENT || 'sqlite3';
    const isPostgres = dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql';
    let result;
    let newAddress;

    if (isPostgres) {
      // PostgreSQL: use client-based transaction
      const client = await database.beginTransaction();
      try {
        // If this is set as default, unset other defaults of the same type
        if (isDefault) {
          await client.query(`
            UPDATE user_addresses 
            SET is_default = FALSE 
            WHERE user_id = $1 AND type = $2
          `, [userId, type]);
        }

        // Create the new address
        const insertResult = await client.query(`
          INSERT INTO user_addresses (
            user_id, type, first_name, last_name, company, address_line_1, address_line_2,
            city, state, postal_code, country, phone, is_default
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id
        `, [
          userId, type, firstName, lastName, company || null, addressLine1, addressLine2 || null,
          city, state, postalCode, country, phone || null, isDefault
        ]);

        result = { id: insertResult.rows[0].id };

        await database.commit(client);

        // Get the created address
        newAddress = await database.get(`
          SELECT * FROM user_addresses WHERE id = $1
        `, [result.id]);
      } catch (error) {
        await database.rollback(client);
        throw error;
      }
    } else {
      // SQLite: use simple transaction
      await database.beginTransaction();

      try {
        // If this is set as default, unset other defaults of the same type
        if (isDefault) {
          await database.execute(`
            UPDATE user_addresses 
            SET is_default = FALSE 
            WHERE user_id = $1 AND type = $2
          `, [userId, type]);
        }

        // Create the new address
        result = await database.execute(`
          INSERT INTO user_addresses (
            user_id, type, first_name, last_name, company, address_line_1, address_line_2,
            city, state, postal_code, country, phone, is_default
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          userId, type, firstName, lastName, company || null, addressLine1, addressLine2 || null,
          city, state, postalCode, country, phone || null, isDefault
        ]);

        await database.commit();

        // Get the created address
        newAddress = await database.get(`
          SELECT * FROM user_addresses WHERE id = $1
        `, [result.id]);
      } catch (error) {
        await database.rollback();
        throw error;
      }
    }

    res.status(201).json({
      message: 'Address created successfully',
      address: {
        id: newAddress.id,
        type: newAddress.type,
        firstName: newAddress.first_name,
        lastName: newAddress.last_name,
        company: newAddress.company,
        addressLine1: newAddress.address_line_1,
        addressLine2: newAddress.address_line_2,
        city: newAddress.city,
        state: newAddress.state,
        postalCode: newAddress.postal_code,
        country: newAddress.country,
        phone: newAddress.phone,
        isDefault: newAddress.is_default,
        createdAt: newAddress.created_at,
        updatedAt: newAddress.updated_at
      }
    });
  } catch (error) {
    console.error('Error creating address:', error);
    res.status(500).json({ error: error.message || 'Failed to create address' });
  }
});

// Update user address
router.put('/addresses/:id', authenticateUser, idValidation, async (req, res) => {
  const userId = req.user.id;
  const addressId = req.params.id;
  const {
    type,
    firstName,
    lastName,
    company,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
    phone,
    isDefault
  } = req.body;

  try {
    // Check if address exists and belongs to user
    const existingAddress = await database.get(`
      SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2
    `, [addressId, userId]);

    if (!existingAddress) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await database.beginTransaction();

    // If this is set as default, unset other defaults of the same type
    if (isDefault) {
      await database.execute(`
        UPDATE user_addresses 
        SET is_default = FALSE 
        WHERE user_id = $1 AND type = $2 AND id != $3
      `, [userId, type || existingAddress.type, addressId]);
    }

    // Build update query
    const updates = [];
    const params = [];

    if (type !== undefined) {
      updates.push('type = $1');
      params.push(type);
    }
    if (firstName !== undefined) {
      updates.push('first_name = $1');
      params.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push('last_name = $1');
      params.push(lastName);
    }
    if (company !== undefined) {
      updates.push('company = $1');
      params.push(company);
    }
    if (addressLine1 !== undefined) {
      updates.push('address_line_1 = $1');
      params.push(addressLine1);
    }
    if (addressLine2 !== undefined) {
      updates.push('address_line_2 = $1');
      params.push(addressLine2);
    }
    if (city !== undefined) {
      updates.push('city = $1');
      params.push(city);
    }
    if (state !== undefined) {
      updates.push('state = $1');
      params.push(state);
    }
    if (postalCode !== undefined) {
      updates.push('postal_code = $1');
      params.push(postalCode);
    }
    if (country !== undefined) {
      updates.push('country = $1');
      params.push(country);
    }
    if (phone !== undefined) {
      updates.push('phone = $1');
      params.push(phone);
    }
    if (isDefault !== undefined) {
      updates.push('is_default = $1');
      params.push(isDefault);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(addressId);

    await database.execute(`
      UPDATE user_addresses
      SET ${updates.join(', ')}
      WHERE id = $1
    `, params);

    await database.commit();

    // Get the updated address
    const updatedAddress = await database.get(`
      SELECT * FROM user_addresses WHERE id = $1
    `, [addressId]);

    res.json({
      message: 'Address updated successfully',
      address: {
        id: updatedAddress.id,
        type: updatedAddress.type,
        firstName: updatedAddress.first_name,
        lastName: updatedAddress.last_name,
        company: updatedAddress.company,
        addressLine1: updatedAddress.address_line_1,
        addressLine2: updatedAddress.address_line_2,
        city: updatedAddress.city,
        state: updatedAddress.state,
        postalCode: updatedAddress.postal_code,
        country: updatedAddress.country,
        phone: updatedAddress.phone,
        isDefault: updatedAddress.is_default,
        createdAt: updatedAddress.created_at,
        updatedAt: updatedAddress.updated_at
      }
    });
  } catch (error) {
    await database.rollback();
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// Delete user address
router.delete('/addresses/:id', authenticateUser, idValidation, async (req, res) => {
  const userId = req.user.id;
  const addressId = req.params.id;

  try {
    // Check if address exists and belongs to user
    const existingAddress = await database.get(`
      SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2
    `, [addressId, userId]);

    if (!existingAddress) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await database.execute(`
      DELETE FROM user_addresses WHERE id = $1 AND user_id = $2
    `, [addressId, userId]);

    res.json({
      message: 'Address deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

// Set address as default
router.put('/addresses/:id/default', authenticateUser, idValidation, async (req, res) => {
  const userId = req.user.id;
  const addressId = req.params.id;

  try {
    // Check if address exists and belongs to user
    const existingAddress = await database.get(`
      SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2
    `, [addressId, userId]);

    if (!existingAddress) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await database.beginTransaction();

    // Unset other defaults of the same type
    await database.execute(`
      UPDATE user_addresses 
      SET is_default = FALSE 
      WHERE user_id = $1 AND type = $2
    `, [userId, existingAddress.type]);

    // Set this address as default
    await database.execute(`
      UPDATE user_addresses 
      SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [addressId]);

    await database.commit();

    res.json({
      message: 'Address set as default successfully'
    });
  } catch (error) {
    await database.rollback();
    res.status(500).json({ error: 'Failed to set address as default' });
  }
});

module.exports = router; 