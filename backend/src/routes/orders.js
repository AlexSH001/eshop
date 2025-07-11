const express = require('express');
const { database } = require('../database/init');
const { generateOrderNumber } = require('../utils/auth');
const { authenticateUser, authenticateAdmin, optionalAuth } = require('../middleware/auth');
const {
  createOrderValidation,
  updateOrderStatusValidation,
  idValidation,
  paginationValidation
} = require('../middleware/validation');
const { NotFoundError } = require('../middleware/errorHandler');

const router = express.Router();

// Create order (checkout)
router.post('/', optionalAuth, createOrderValidation, async (req, res) => {
  const {
    email,
    phone,
    paymentMethod,
    billingAddress,
    shippingAddress,
    cartItems,
    sessionId
  } = req.body;

  const userId = req.user ? req.user.id : null;

  try {
    await database.beginTransaction();

    // Get cart items if not provided
    let orderItems = cartItems;
    if (!orderItems || orderItems.length === 0) {
      const cartQuery = userId
        ? 'SELECT ci.*, p.name, p.price, p.stock FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ?'
        : 'SELECT ci.*, p.name, p.price, p.stock FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.session_id = ?';

      const cartData = await database.query(cartQuery, [userId || sessionId]);

      if (cartData.length === 0) {
        await database.rollback();
        return res.status(400).json({ error: 'Cart is empty' });
      }

      orderItems = cartData.map(item => ({
        productId: item.product_id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }));
    }

    // Validate stock availability
    for (const item of orderItems) {
      const product = await database.get(
        'SELECT stock, status FROM products WHERE id = ?',
        [item.productId]
      );

      if (!product || product.status !== 'active') {
        await database.rollback();
        return res.status(400).json({
          error: `Product ${item.name} is no longer available`
        });
      }

      if (product.stock < item.quantity) {
        await database.rollback();
        return res.status(400).json({
          error: `Insufficient stock for ${item.name}. Available: ${product.stock}`
        });
      }
    }

    // Calculate totals
    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxRate = 0.08; // 8% tax rate
    const taxAmount = subtotal * taxRate;
    const shippingAmount = subtotal > 100 ? 0 : 9.99; // Free shipping over $100
    const total = subtotal + taxAmount + shippingAmount;

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create order
    const orderResult = await database.execute(`
      INSERT INTO orders (
        order_number, user_id, email, phone, status, payment_status, payment_method,
        billing_first_name, billing_last_name, billing_company, billing_address_line_1,
        billing_address_line_2, billing_city, billing_state, billing_postal_code, billing_country,
        shipping_first_name, shipping_last_name, shipping_company, shipping_address_line_1,
        shipping_address_line_2, shipping_city, shipping_state, shipping_postal_code, shipping_country,
        subtotal, tax_amount, shipping_amount, total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderNumber,
      userId,
      email,
      phone || null,
      'pending',
      'pending',
      paymentMethod,
      billingAddress.firstName,
      billingAddress.lastName,
      billingAddress.company || null,
      billingAddress.addressLine1,
      billingAddress.addressLine2 || null,
      billingAddress.city,
      billingAddress.state,
      billingAddress.postalCode,
      billingAddress.country,
      shippingAddress.firstName,
      shippingAddress.lastName,
      shippingAddress.company || null,
      shippingAddress.addressLine1,
      shippingAddress.addressLine2 || null,
      shippingAddress.city,
      shippingAddress.state,
      shippingAddress.postalCode,
      shippingAddress.country,
      subtotal,
      taxAmount,
      shippingAmount,
      total
    ]);

    const orderId = orderResult.id;

    // Create order items and update product stock
    for (const item of orderItems) {
      // Add order item
      await database.execute(`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, price, total)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        orderId,
        item.productId,
        item.name,
        item.quantity,
        item.price,
        item.price * item.quantity
      ]);

      // Update product stock and sales count
      await database.execute(`
        UPDATE products
        SET stock = stock - ?, sales_count = sales_count + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [item.quantity, item.quantity, item.productId]);
    }

    // Clear cart
    if (userId) {
      await database.execute('DELETE FROM cart_items WHERE user_id = ?', [userId]);
    } else if (sessionId) {
      await database.execute('DELETE FROM cart_items WHERE session_id = ?', [sessionId]);
    }

    await database.commit();

    // Get created order with items
    const order = await database.get('SELECT * FROM orders WHERE id = ?', [orderId]);
    const items = await database.query(`
      SELECT oi.*, p.featured_image
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        ...order,
        items: items.map(item => ({
          id: item.id,
          productId: item.product_id,
          name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          image: item.featured_image
        }))
      }
    });

  } catch (error) {
    await database.rollback();
    throw error;
  }
});

// Get user's orders
router.get('/my-orders', authenticateUser, paginationValidation, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  const userId = req.user.id;

  const orders = await database.query(`
    SELECT * FROM orders
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [userId, parseInt(limit), offset]);

  const [{ total }] = await database.query(
    'SELECT COUNT(*) as total FROM orders WHERE user_id = ?',
    [userId]
  );

  // Get order items for each order
  for (const order of orders) {
    const items = await database.query(`
      SELECT oi.*, p.featured_image
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [order.id]);

    order.items = items ? items.map(item => ({
      id: item.id,
      productId: item.product_id,
      name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
      image: item.featured_image
    })) : [];
  }

  res.json({
    orders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  });
});

// Get all orders (public for admin portal)
router.get('/', paginationValidation, async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    paymentStatus,
    search,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = req.query;

  const offset = (page - 1) * limit;

  let whereConditions = [];
  let params = [];

  // Status filter
  if (status && status !== 'all') {
    whereConditions.push('status = ?');
    params.push(status);
  }

  // Payment status filter
  if (paymentStatus && paymentStatus !== 'all') {
    whereConditions.push('payment_status = ?');
    params.push(paymentStatus);
  }

  // Search filter
  if (search) {
    whereConditions.push('(order_number LIKE ? OR email LIKE ? OR billing_first_name LIKE ? OR billing_last_name LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Validate sort
  const validSortColumns = ['created_at', 'total', 'status', 'order_number'];
  const validSortOrder = ['ASC', 'DESC'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const sortDirection = validSortOrder.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

  const orders = await database.query(`
    SELECT * FROM orders
    ${whereClause}
    ORDER BY ${sortColumn} ${sortDirection}
    LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), offset]);

  const [{ total }] = await database.query(`
    SELECT COUNT(*) as total FROM orders ${whereClause}
  `, params);

  // Get order items for each order
  for (const order of orders) {
    // Set default empty array for items
    order.items = [];
    
    try {
      const items = await database.query(`
        SELECT oi.*, p.featured_image
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);

      if (items && Array.isArray(items) && items.length > 0) {
        order.items = items.map(item => ({
          id: item.id,
          productId: item.product_id,
          name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          image: item.featured_image
        }));
      }
    } catch (error) {
      console.error(`Error fetching items for order ${order.id}:`, error);
      // items already set to empty array above
    }
  }

  res.json({
    orders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  });
});

// Admin: Get all orders (authenticated)
router.get('/authenticated', authenticateAdmin, paginationValidation, async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    paymentStatus,
    search,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = req.query;

  const offset = (page - 1) * limit;

  let whereConditions = [];
  let params = [];

  // Status filter
  if (status && status !== 'all') {
    whereConditions.push('status = ?');
    params.push(status);
  }

  // Payment status filter
  if (paymentStatus && paymentStatus !== 'all') {
    whereConditions.push('payment_status = ?');
    params.push(paymentStatus);
  }

  // Search filter
  if (search) {
    whereConditions.push('(order_number LIKE ? OR email LIKE ? OR billing_first_name LIKE ? OR billing_last_name LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Validate sort
  const validSortColumns = ['created_at', 'total', 'status', 'order_number'];
  const validSortOrder = ['ASC', 'DESC'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const sortDirection = validSortOrder.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

  const orders = await database.query(`
    SELECT * FROM orders
    ${whereClause}
    ORDER BY ${sortColumn} ${sortDirection}
    LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), offset]);

  const [{ total }] = await database.query(`
    SELECT COUNT(*) as total FROM orders ${whereClause}
  `, params);

  // Get order items for each order
  for (const order of orders) {
    // Set default empty array for items
    order.items = [];
    
    try {
      const items = await database.query(`
        SELECT oi.*, p.featured_image
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);

      if (items && Array.isArray(items) && items.length > 0) {
        order.items = items.map(item => ({
          id: item.id,
          productId: item.product_id,
          name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          image: item.featured_image
        }));
      }
    } catch (error) {
      console.error(`Error fetching items for order ${order.id}:`, error);
      // items already set to empty array above
    }
  }

  res.json({
    orders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  });
});

// Get single order
router.get('/:id', idValidation, async (req, res) => {
  const orderId = req.params.id;

  // If user is authenticated, check ownership
  let whereClause = 'WHERE o.id = ?';
  let params = [orderId];

  if (req.user) {
    whereClause += ' AND o.user_id = ?';
    params.push(req.user.id);
  }

  const order = await database.get(`
    SELECT o.* FROM orders o ${whereClause}
  `, params);

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  // Get order items
  const items = await database.query(`
    SELECT oi.*, p.featured_image
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `, [orderId]);

  res.json({
    order: {
      ...order,
      items: items.map(item => ({
        id: item.id,
        productId: item.product_id,
        name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        image: item.featured_image
      }))
    }
  });
});

// Admin: Update order status
router.put('/:id/status', authenticateAdmin, updateOrderStatusValidation, async (req, res) => {
  const orderId = req.params.id;
  const { status, trackingNumber, notes } = req.body;

  const order = await database.get('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  const updates = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
  const params = [status];

  if (trackingNumber) {
    updates.push('tracking_number = ?');
    params.push(trackingNumber);
  }

  if (notes) {
    updates.push('notes = ?');
    params.push(notes);
  }

  // Set shipped_at or delivered_at timestamps
  if (status === 'shipped' && !order.shipped_at) {
    updates.push('shipped_at = CURRENT_TIMESTAMP');
  } else if (status === 'delivered' && !order.delivered_at) {
    updates.push('delivered_at = CURRENT_TIMESTAMP');
  }

  params.push(orderId);

  await database.execute(
    `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  const updatedOrder = await database.get('SELECT * FROM orders WHERE id = ?', [orderId]);

  res.json({
    message: 'Order status updated successfully',
    order: updatedOrder
  });
});

// Admin: Get order statistics
router.get('/admin/statistics', authenticateAdmin, async (req, res) => {
  const { period = '30' } = req.query; // days

  const stats = await database.get(`
    SELECT
      COUNT(*) as total_orders,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
      COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
      COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_orders,
      COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
      COALESCE(SUM(total), 0) as total_revenue,
      COALESCE(AVG(total), 0) as average_order_value
    FROM orders
    WHERE created_at >= datetime('now', '-${period} days')
  `);

  const dailyStats = await database.query(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as orders_count,
      COALESCE(SUM(total), 0) as revenue
    FROM orders
    WHERE created_at >= datetime('now', '-${period} days')
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `);

  res.json({
    summary: {
      ...stats,
      total_revenue: Math.round(stats.total_revenue * 100) / 100,
      average_order_value: Math.round(stats.average_order_value * 100) / 100
    },
    daily: dailyStats.map(day => ({
      ...day,
      revenue: Math.round(day.revenue * 100) / 100
    }))
  });
});

module.exports = router;
