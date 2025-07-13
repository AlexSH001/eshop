const express = require('express');
const { postgresDatabase } = require('../database/init-postgres');
const { optionalAuth, authenticateUser } = require('../middleware/auth');
const { addToCartValidation, updateCartValidation, idValidation } = require('../middleware/validation');
const { NotFoundError } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Helper function to get cart identifier
const getCartIdentifier = (req) => {
  if (req.user) {
    return { userId: req.user.id, sessionId: null };
  } else {
    // Generate or get session ID from headers
    const sessionId = req.headers['x-session-id'] || uuidv4();
    return { userId: null, sessionId };
  }
};

// Get cart contents
router.get('/', optionalAuth, async (req, res) => {
  const { userId, sessionId } = getCartIdentifier(req);

  let cartQuery;
  let params;

  if (userId) {
    cartQuery = `
      SELECT
        ci.*,
        p.name,
        p.price as current_price,
        p.original_price,
        p.featured_image,
        p.stock,
        p.status,
        c.name as category_name
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ci.user_id = $1
      ORDER BY ci.created_at DESC
    `;
    params = [userId];
  } else {
    cartQuery = `
      SELECT
        ci.*,
        p.name,
        p.price as current_price,
        p.original_price,
        p.featured_image,
        p.stock,
        p.status,
        c.name as category_name
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ci.session_id = $1
      ORDER BY ci.created_at DESC
    `;
    params = [sessionId];
  }

  const cartItems = await postgresDatabase.query(cartQuery, params);

  // Calculate totals
  let subtotal = 0;
  let itemCount = 0;

  const formattedItems = cartItems.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    itemCount += item.quantity;

    return {
      id: item.id,
      productId: item.product_id,
      name: item.name,
      price: item.price,
      currentPrice: item.current_price,
      originalPrice: item.original_price,
      image: item.featured_image,
      category: item.category_name,
      quantity: item.quantity,
      total: itemTotal,
      stock: item.stock,
      status: item.status,
      addedAt: item.created_at
    };
  });

  res.json({
    sessionId: sessionId || undefined,
    items: formattedItems,
    summary: {
      itemCount,
      subtotal: Math.round(subtotal * 100) / 100,
      total: Math.round(subtotal * 100) / 100 // Will add tax/shipping later
    }
  });
});

// Add item to cart
router.post('/items', optionalAuth, addToCartValidation, async (req, res) => {
  const { productId, quantity } = req.body;
  const { userId, sessionId } = getCartIdentifier(req);

  // Check if product exists and is available
  const product = await postgresDatabase.get(
    'SELECT id, name, price, stock, status FROM products WHERE id = $1 AND status = $2',
    [productId, 'active']
  );

  if (!product) {
    throw new NotFoundError('Product not found or unavailable');
  }

  if (product.stock < quantity) {
    return res.status(400).json({
      error: 'Insufficient stock',
      availableStock: product.stock
    });
  }

  try {
    // Check if item already exists in cart
    let existingItem;
    if (userId) {
      existingItem = await postgresDatabase.get(
        'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2',
        [userId, productId]
      );
    } else {
      existingItem = await postgresDatabase.get(
        'SELECT * FROM cart_items WHERE session_id = $1 AND product_id = $2',
        [sessionId, productId]
      );
    }

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;

      if (product.stock < newQuantity) {
        return res.status(400).json({
          error: 'Insufficient stock for requested quantity',
          currentQuantity: existingItem.quantity,
          requestedQuantity: quantity,
          availableStock: product.stock
        });
      }

      await postgresDatabase.execute(
        'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newQuantity, existingItem.id]
      );

      res.json({
        message: 'Cart item updated successfully',
        sessionId: sessionId || undefined,
        item: {
          id: existingItem.id,
          productId,
          quantity: newQuantity
        }
      });
    } else {
      // Add new item
      const result = await postgresDatabase.execute(
        'INSERT INTO cart_items (user_id, session_id, product_id, quantity, price) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [userId, sessionId, productId, quantity, product.price]
      );

      res.status(201).json({
        message: 'Item added to cart successfully',
        sessionId: sessionId || undefined,
        item: {
          id: result.id,
          productId,
          quantity
        }
      });
    }
  } catch (error) {
    if (error.code === '23505') { // SQLITE_CONSTRAINT_UNIQUE
      return res.status(409).json({ error: 'Item already in cart' });
    }
    throw error;
  }
});

// Update cart item quantity
router.put('/items/:itemId', optionalAuth, updateCartValidation, async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;
  const { userId, sessionId } = getCartIdentifier(req);

  // Get cart item with product info
  let cartItem;
  if (userId) {
    cartItem = await postgresDatabase.get(`
      SELECT ci.*, p.stock, p.name
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.id = $1 AND ci.user_id = $2
    `, [itemId, userId]);
  } else {
    cartItem = await postgresDatabase.get(`
      SELECT ci.*, p.stock, p.name
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.id = $1 AND ci.session_id = $2
    `, [itemId, sessionId]);
  }

  if (!cartItem) {
    throw new NotFoundError('Cart item not found');
  }

  if (cartItem.stock < quantity) {
    return res.status(400).json({
      error: 'Insufficient stock',
      availableStock: cartItem.stock
    });
  }

  await postgresDatabase.execute(
    'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [quantity, itemId]
  );

  res.json({
    message: 'Cart item updated successfully',
    item: {
      id: itemId,
      quantity
    }
  });
});

// Remove item from cart
router.delete('/items/:itemId', optionalAuth, async (req, res) => {
  const { itemId } = req.params;
  const { userId, sessionId } = getCartIdentifier(req);

  let cartItem;
  if (userId) {
    cartItem = await postgresDatabase.get(
      'SELECT id FROM cart_items WHERE id = $1 AND user_id = $2',
      [itemId, userId]
    );
  } else {
    cartItem = await postgresDatabase.get(
      'SELECT id FROM cart_items WHERE id = $1 AND session_id = $2',
      [itemId, sessionId]
    );
  }

  if (!cartItem) {
    throw new NotFoundError('Cart item not found');
  }

  await postgresDatabase.execute('DELETE FROM cart_items WHERE id = $1', [itemId]);

  res.json({
    message: 'Item removed from cart successfully'
  });
});

// Clear entire cart
router.delete('/', optionalAuth, async (req, res) => {
  const { userId, sessionId } = getCartIdentifier(req);

  if (userId) {
    await postgresDatabase.execute('DELETE FROM cart_items WHERE user_id = $1', [userId]);
  } else {
    await postgresDatabase.execute('DELETE FROM cart_items WHERE session_id = $1', [sessionId]);
  }

  res.json({
    message: 'Cart cleared successfully'
  });
});

// Merge guest cart with user cart (called after login)
router.post('/merge', authenticateUser, async (req, res) => {
  const { sessionId } = req.body;
  const userId = req.user.id;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  try {
    await postgresDatabase.beginTransaction();

    // Get guest cart items
    const guestItems = await postgresDatabase.query(
      'SELECT * FROM cart_items WHERE session_id = $1',
      [sessionId]
    );

    for (const item of guestItems) {
      // Check if user already has this product in cart
      const existingUserItem = await postgresDatabase.get(
        'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2',
        [userId, item.product_id]
      );

      if (existingUserItem) {
        // Update quantity (take the maximum)
        const maxQuantity = Math.max(existingUserItem.quantity, item.quantity);
        await postgresDatabase.execute(
          'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [maxQuantity, existingUserItem.id]
        );
      } else {
        // Move guest item to user cart
        await postgresDatabase.execute(
          'UPDATE cart_items SET user_id = $1, session_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [userId, item.id]
        );
      }
    }

    // Clean up any remaining guest items
    await postgresDatabase.execute('DELETE FROM cart_items WHERE session_id = $1', [sessionId]);

    await postgresDatabase.commit();

    res.json({
      message: 'Cart merged successfully'
    });
  } catch (error) {
    await postgresDatabase.rollback();
    throw error;
  }
});

// Get cart item count (for badge display)
router.get('/count', optionalAuth, async (req, res) => {
  const { userId, sessionId } = getCartIdentifier(req);

  let countQuery;
  let params;

  if (userId) {
    countQuery = 'SELECT COALESCE(SUM(quantity), 0) as count FROM cart_items WHERE user_id = $1';
    params = [userId];
  } else {
    countQuery = 'SELECT COALESCE(SUM(quantity), 0) as count FROM cart_items WHERE session_id = $1';
    params = [sessionId];
  }

  const [{ count }] = await postgresDatabase.query(countQuery, params);

  res.json({
    sessionId: sessionId || undefined,
    count: parseInt(count)
  });
});

module.exports = router;
