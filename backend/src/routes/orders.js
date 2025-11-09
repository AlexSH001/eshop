const express = require('express');
const { database } = require('../database');
const { generateOrderNumber } = require('../utils/auth');
const { authenticateUser, authenticateAdmin, optionalAuth } = require('../middleware/auth');
const {
  createOrderValidation,
  updateOrderStatusValidation,
  idValidation,
  paginationValidation
} = require('../middleware/validation');
const { NotFoundError } = require('../middleware/errorHandler');
const stripeService = require('../services/stripeService');

const router = express.Router();

// Create order (checkout)
router.post('/', authenticateUser, createOrderValidation, async (req, res) => {
  const {
    email,
    phone,
    billingAddress,
    shippingAddress,
    cartItems,
    sessionId,
    saveShippingAddress = false
  } = req.body;

  const userId = req.user ? req.user.id : null;

  console.log('Order creation request:', {
    email,
    phone,
    userId,
    cartItemsCount: cartItems ? cartItems.length : 0,
    billingAddress: billingAddress ? 'present' : 'missing',
    shippingAddress: shippingAddress ? 'present' : 'missing'
  });

  // Get database type for transaction handling
  const dbType = database.getType() || process.env.DB_CLIENT || 'sqlite3';
  const isPostgres = dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql';
  let transactionClient = null;

  try {
    // Begin transaction
    if (isPostgres) {
      transactionClient = await database.beginTransaction();
    } else {
      await database.beginTransaction();
    }

    // Helper function to execute queries within transaction
    const executeQuery = async (sql, params) => {
      if (isPostgres && transactionClient) {
        const result = await transactionClient.query(sql, params);
        return result.rows || result;
      } else {
        return await database.query(sql, params);
      }
    };

    const executeGet = async (sql, params) => {
      if (isPostgres && transactionClient) {
        const result = await transactionClient.query(sql, params);
        return result.rows && result.rows.length > 0 ? result.rows[0] : null;
      } else {
        return await database.get(sql, params);
      }
    };

    const executeExecute = async (sql, params) => {
      if (isPostgres && transactionClient) {
        const result = await transactionClient.query(sql, params);
        // For INSERT with RETURNING, PostgreSQL returns rows
        if (result.rows && result.rows.length > 0) {
          return { id: result.rows[0].id };
        }
        // For other operations, return result with rowCount
        return { id: result.rows?.[0]?.id, rowCount: result.rowCount };
      } else {
        return await database.execute(sql, params);
      }
    };

    // Get cart items if not provided
    let orderItems = cartItems;
    if (!orderItems || orderItems.length === 0) {
      console.log('No cart items provided, fetching from database...');
      const cartQuery = userId
        ? 'SELECT ci.*, p.name, p.price, p.stock FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = $1'
        : 'SELECT ci.*, p.name, p.price, p.stock FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.session_id = $1';

      const cartData = await executeQuery(cartQuery, [userId || sessionId]);
      console.log('Cart data from database:', cartData);

      if (cartData.length === 0) {
        if (isPostgres) {
          await database.rollback(transactionClient);
        } else {
          await database.rollback();
        }
        return res.status(400).json({ error: 'Cart is empty' });
      }

      orderItems = cartData.map(item => ({
        productId: item.product_id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }));
    }

    console.log('Order items to process:', orderItems);

    // Validate stock availability
    for (const item of orderItems) {
      const product = await executeGet(
        'SELECT stock, status FROM products WHERE id = $1',
        [item.productId]
      );

      if (!product || product.status !== 'active') {
        if (isPostgres) {
          await database.rollback(transactionClient);
        } else {
          await database.rollback();
        }
        return res.status(400).json({
          error: `Product ${item.name} is no longer available`
        });
      }

      if (product.stock < item.quantity) {
        if (isPostgres) {
          await database.rollback(transactionClient);
        } else {
          await database.rollback();
        }
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

    // Create order - use RETURNING for PostgreSQL to get the ID
    const orderInsertSql = isPostgres
      ? `
        INSERT INTO orders (
          order_number, user_id, email, phone, status, payment_status, payment_method, payment_id,
          billing_first_name, billing_last_name, billing_company, billing_address_line_1,
          billing_address_line_2, billing_city, billing_state, billing_postal_code, billing_country,
          shipping_first_name, shipping_last_name, shipping_company, shipping_address_line_1,
          shipping_address_line_2, shipping_city, shipping_state, shipping_postal_code, shipping_country,
          subtotal, tax_amount, shipping_amount, discount_amount, total, notes, tracking_number, shipped_at, delivered_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35)
        RETURNING id
      `
      : `
        INSERT INTO orders (
          order_number, user_id, email, phone, status, payment_status, payment_method, payment_id,
          billing_first_name, billing_last_name, billing_company, billing_address_line_1,
          billing_address_line_2, billing_city, billing_state, billing_postal_code, billing_country,
          shipping_first_name, shipping_last_name, shipping_company, shipping_address_line_1,
          shipping_address_line_2, shipping_city, shipping_state, shipping_postal_code, shipping_country,
          subtotal, tax_amount, shipping_amount, discount_amount, total, notes, tracking_number, shipped_at, delivered_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35)
      `;

    const orderResult = await executeExecute(orderInsertSql, [
      orderNumber,
      userId,
      email,
      phone || null,
      'pending',
      'pending',
      'stripe',
      null, // payment_id
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
      0, // discount_amount
      total,
      null, // notes
      null, // tracking_number
      null, // shipped_at
      null  // delivered_at
    ]);

    const orderId = orderResult.id;

    // Create order items and update product stock
    for (const item of orderItems) {
      // Add order item
      await executeExecute(`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, price, total)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        orderId,
        item.productId,
        item.name,
        item.quantity,
        item.price,
        item.price * item.quantity
      ]);

      // Update product stock and sales count
      await executeExecute(`
        UPDATE products
        SET stock = stock - $1, sales_count = sales_count + $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [item.quantity, item.quantity, item.productId]);
    }

    // Save shipping address if requested and user is authenticated
    if (saveShippingAddress && userId) {
      // Check if this address already exists
      const existingAddress = await executeGet(`
        SELECT id FROM user_addresses 
        WHERE user_id = $1 AND type = 'shipping' 
        AND first_name = $2 AND last_name = $3 
        AND address_line_1 = $4 AND city = $5 AND state = $6 AND postal_code = $7
      `, [
        userId, 
        shippingAddress.firstName, 
        shippingAddress.lastName, 
        shippingAddress.addressLine1, 
        shippingAddress.city, 
        shippingAddress.state, 
        shippingAddress.postalCode
      ]);

      if (!existingAddress) {
        await executeExecute(`
          INSERT INTO user_addresses (
            user_id, type, first_name, last_name, company, address_line_1, address_line_2,
            city, state, postal_code, country, phone, is_default
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          userId, 'shipping', shippingAddress.firstName, shippingAddress.lastName,
          shippingAddress.company || null, shippingAddress.addressLine1, shippingAddress.addressLine2 || null,
          shippingAddress.city, shippingAddress.state, shippingAddress.postalCode, shippingAddress.country,
          phone || null, false // Don't set as default automatically
        ]);
      }
    }

    // Clear cart
    if (userId) {
      await executeExecute('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    } else if (sessionId) {
      await executeExecute('DELETE FROM cart_items WHERE session_id = $1', [sessionId]);
    }

    // Commit transaction
    if (isPostgres) {
      await database.commit(transactionClient);
    } else {
      await database.commit();
    }

    // Get created order with items (outside transaction)
    const order = await database.get('SELECT * FROM orders WHERE id = $1', [orderId]);
    const items = await database.query(`
      SELECT oi.*, p.featured_image
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
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
    console.error('Order creation error:', error);
    
    // Rollback transaction
    if (isPostgres && transactionClient) {
      await database.rollback(transactionClient);
    } else {
      await database.rollback();
    }
    
    // Send proper error response
    res.status(500).json({
      error: error.message || 'Failed to create order',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get user's orders
router.get('/my-orders', authenticateUser, paginationValidation, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  const userId = req.user.id;

  const orders = await database.query(`
    SELECT * FROM orders
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `, [userId, parseInt(limit), offset]);

  const [{ total }] = await database.query(
    'SELECT COUNT(*) as total FROM orders WHERE user_id = $1',
    [userId]
  );

  // Get order items for each order
  for (const order of orders) {
    const items = await database.query(`
      SELECT oi.*, p.featured_image
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
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
    whereConditions.push('status = $1');
    params.push(status);
  }

  // Payment status filter
  if (paymentStatus && paymentStatus !== 'all') {
    whereConditions.push('payment_status = $1');
    params.push(paymentStatus);
  }

  // Search filter
  if (search) {
    whereConditions.push('(order_number LIKE $1 OR email LIKE $2 OR billing_first_name LIKE $3 OR billing_last_name LIKE $4)');
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
    LIMIT $1 OFFSET $2
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
        WHERE oi.order_id = $1
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
    whereConditions.push('status = $1');
    params.push(status);
  }

  // Payment status filter
  if (paymentStatus && paymentStatus !== 'all') {
    whereConditions.push('payment_status = $1');
    params.push(paymentStatus);
  }

  // Search filter
  if (search) {
    whereConditions.push('(order_number LIKE $1 OR email LIKE $2 OR billing_first_name LIKE $3 OR billing_last_name LIKE $4)');
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
    LIMIT $1 OFFSET $2
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
        WHERE oi.order_id = $1
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
  let whereClause = 'WHERE o.id = $1';
  let params = [orderId];

  if (req.user) {
    whereClause += ' AND o.user_id = $2';
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
    WHERE oi.order_id = $1
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

  const order = await database.get('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  const updates = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
  const params = [status];

  if (trackingNumber) {
    updates.push('tracking_number = $2');
    params.push(trackingNumber);
  }

  if (notes) {
    updates.push('notes = $3');
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
    `UPDATE orders SET ${updates.join(', ')} WHERE id = $1`,
    params
  );

  const updatedOrder = await database.get('SELECT * FROM orders WHERE id = $1', [orderId]);

  res.json({
    message: 'Order status updated successfully',
    order: updatedOrder
  });
});

// Admin: Delete order
router.delete('/:id', authenticateAdmin, idValidation, async (req, res) => {
  const orderId = req.params.id;

  const order = await database.get('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  // Start transaction
  const client = await database.beginTransaction();
  
  try {
    // Delete order items first (foreign key constraint)
    await database.execute('DELETE FROM order_items WHERE order_id = $1', [orderId]);
    
    // Delete the order
    await database.execute('DELETE FROM orders WHERE id = $1', [orderId]);
    
    await database.commit(client);
    
    res.json({
      message: 'Order deleted successfully'
    });
  } catch (error) {
    await database.rollback(client);
    throw error;
  }
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

// Initiate Stripe payment (using payment links)
router.post('/:id/pay/stripe', optionalAuth, async (req, res) => {
  const { id } = req.params;
  const order = await database.get('SELECT * FROM orders WHERE id = $1', [id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.payment_status !== 'pending') return res.status(400).json({ error: 'Order already paid or invalid status' });

  const successUrl = `${process.env.FRONTEND_URL}/orders/order-success?orderId=${id}`;
  const cancelUrl = `${process.env.FRONTEND_URL}/orders/${id}`;
  
  try {
    // Extract shipping address from order to pre-fill in Stripe
    const shippingAddress = order.shipping_address_line_1 ? {
      firstName: order.shipping_first_name,
      lastName: order.shipping_last_name,
      addressLine1: order.shipping_address_line_1,
      addressLine2: order.shipping_address_line_2,
      city: order.shipping_city,
      state: order.shipping_state,
      postalCode: order.shipping_postal_code,
      country: order.shipping_country || 'US',
    } : null;

    const paymentLink = await stripeService.createPaymentLink({
      orderId: order.order_number,
      total: order.total,
      currency: 'sgd',
      customerEmail: order.email,
      shippingAddress: shippingAddress,
      metadata: {
        orderId: order.id,
        userId: order.user_id,
      },
      successUrl,
      cancelUrl,
    });

    // Store checkout session ID in order for reference
    await database.execute(
      'UPDATE orders SET payment_id = $1 WHERE id = $2',
      [paymentLink.sessionId || paymentLink.paymentLinkId, order.id]
    );

    res.json({
      paymentUrl: paymentLink.url,
      url: paymentLink.url, // Alternative key for compatibility
      paymentLinkId: paymentLink.sessionId || paymentLink.paymentLinkId,
    });
  } catch (error) {
    console.error('Stripe payment link creation failed:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create Stripe payment link', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      message: error.message
    });
  }
});

// Stripe webhook handler
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  try {
    const event = stripeService.verifyWebhookSignature(req.body, sig, endpointSecret);

    if (event.type === 'checkout.session.completed') {
      const paymentDetails = stripeService.handlePaymentSuccess(event);
      
      // Try to find order by ID from metadata first (more reliable)
      let order = null;
      if (paymentDetails.metadata?.orderId) {
        order = await database.get(
          'SELECT * FROM orders WHERE id = $1',
          [paymentDetails.metadata.orderId]
        );
      }
      
      // If not found by ID, try by order_number (fallback)
      if (!order && paymentDetails.orderId) {
        order = await database.get(
          'SELECT * FROM orders WHERE order_number = $1',
          [paymentDetails.orderId]
        );
      }
      
      if (order && order.payment_status === 'pending') {
        await database.execute(
          'UPDATE orders SET payment_status = $1, payment_id = $2 WHERE id = $3',
          ['paid', paymentDetails.sessionId, order.id]
        );

        // Clear cart for authenticated users
        if (order.user_id) {
          await database.execute(
            'DELETE FROM cart_items WHERE user_id = $1',
            [order.user_id]
          );
        }

        console.log(`Order ${order.id} marked as paid via Stripe`);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(400).json({ error: 'Webhook signature verification failed' });
  }
});

module.exports = router;
