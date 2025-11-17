const express = require('express');
const { database } = require('../database');
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

  const cartItems = await database.query(cartQuery, params);

  // Calculate totals
  let subtotal = 0;
  let itemCount = 0;

  const formattedItems = cartItems.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    itemCount += item.quantity;

    // Parse specifications if they exist
    let specifications = null;
    if (item.specifications) {
      try {
        specifications = typeof item.specifications === 'string' 
          ? JSON.parse(item.specifications) 
          : item.specifications;
      } catch (e) {
        console.warn('Failed to parse specifications for cart item:', item.id, e);
      }
    }

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
      addedAt: item.created_at,
      specifications: specifications
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

// Helper function to compare specifications
const specsEqual = (specs1, specs2) => {
  if (!specs1 && !specs2) return true;
  if (!specs1 || !specs2) return false;
  
  try {
    const s1 = typeof specs1 === 'string' ? JSON.parse(specs1) : specs1;
    const s2 = typeof specs2 === 'string' ? JSON.parse(specs2) : specs2;
    
    const keys1 = Object.keys(s1 || {}).sort();
    const keys2 = Object.keys(s2 || {}).sort();
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => s1[key] === s2[key]);
  } catch {
    return false;
  }
};

// Add item to cart
router.post('/items', optionalAuth, addToCartValidation, async (req, res) => {
  const { productId, quantity, specifications } = req.body;
  const { userId, sessionId } = getCartIdentifier(req);

  // Check if product exists and is available
  const product = await database.get(
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

  // Serialize specifications for storage (defined outside try block for catch block access)
  const specsJson = specifications ? JSON.stringify(specifications) : null;

  try {
    
    // Check if item already exists in cart with same productId AND same specifications
    let existingItems;
    if (userId) {
      existingItems = await database.query(
        'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2',
        [userId, productId]
      );
    } else {
      existingItems = await database.query(
        'SELECT * FROM cart_items WHERE session_id = $1 AND product_id = $2',
        [sessionId, productId]
      );
    }

    // Find item with matching specifications
    const existingItem = existingItems.find(item => 
      specsEqual(item.specifications, specsJson)
    );

    if (existingItem) {
      // Update quantity for item with same specifications
      const newQuantity = existingItem.quantity + quantity;

      if (product.stock < newQuantity) {
        return res.status(400).json({
          error: 'Insufficient stock for requested quantity',
          currentQuantity: existingItem.quantity,
          requestedQuantity: quantity,
          availableStock: product.stock
        });
      }

      // Update specifications in case they weren't set before
      const dbType = database.getType() || process.env.DB_CLIENT || 'sqlite3';
      const isPostgres = dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql';
      
      if (isPostgres) {
        await database.execute(
          'UPDATE cart_items SET quantity = $1, specifications = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [newQuantity, specsJson, existingItem.id]
        );
      } else {
        await database.execute(
          'UPDATE cart_items SET quantity = $1, specifications = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [newQuantity, specsJson, existingItem.id]
        );
      }

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
      // Add new item with specifications
      const dbType = database.getType() || process.env.DB_CLIENT || 'sqlite3';
      const isPostgres = dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql';
      
      let result;
      if (isPostgres) {
        result = await database.execute(
          'INSERT INTO cart_items (user_id, session_id, product_id, quantity, price, specifications) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          [userId, sessionId, productId, quantity, product.price, specsJson]
        );
      } else {
        result = await database.execute(
          'INSERT INTO cart_items (user_id, session_id, product_id, quantity, price, specifications) VALUES ($1, $2, $3, $4, $5, $6)',
          [userId, sessionId, productId, quantity, product.price, specsJson]
        );
        // For SQLite, get the last insert ID
        const lastRow = await database.get('SELECT last_insert_rowid() as id');
        result = { id: lastRow.id };
      }

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
    // Check if it's a unique constraint violation
    // This might happen if UNIQUE constraints still exist in the database
    if (error.code === '23505' || error.code === 'SQLITE_CONSTRAINT_UNIQUE' || 
        error.message?.includes('UNIQUE constraint') || error.message?.includes('duplicate key')) {
      // If we get here, it means the UNIQUE constraint still exists
      // Try to find existing item and update it instead
      console.warn('UNIQUE constraint violation detected. This may indicate constraints need to be removed.');
      
      // Try to find the existing item
      let existingItem;
      if (userId) {
        existingItem = await database.get(
          'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2',
          [userId, productId]
        );
      } else {
        existingItem = await database.get(
          'SELECT * FROM cart_items WHERE session_id = $1 AND product_id = $2',
          [sessionId, productId]
        );
      }
      
      if (existingItem) {
        // Check if specifications match
        if (specsEqual(existingItem.specifications, specsJson)) {
          // Same specifications, update quantity
          const newQuantity = existingItem.quantity + quantity;
          if (product.stock < newQuantity) {
            return res.status(400).json({
              error: 'Insufficient stock for requested quantity',
              currentQuantity: existingItem.quantity,
              requestedQuantity: quantity,
              availableStock: product.stock
            });
          }
          
          const dbType = database.getType() || process.env.DB_CLIENT || 'sqlite3';
          const isPostgres = dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql';
          
          if (isPostgres) {
            await database.execute(
              'UPDATE cart_items SET quantity = $1, specifications = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
              [newQuantity, specsJson, existingItem.id]
            );
          } else {
            await database.execute(
              'UPDATE cart_items SET quantity = $1, specifications = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
              [newQuantity, specsJson, existingItem.id]
            );
          }
          
          return res.json({
            message: 'Cart item updated successfully',
            sessionId: sessionId || undefined,
            item: {
              id: existingItem.id,
              productId,
              quantity: newQuantity
            }
          });
        } else {
          // Different specifications but UNIQUE constraint prevents adding
          return res.status(409).json({ 
            error: 'Item already in cart. Please remove UNIQUE constraints from cart_items table to allow different specifications.',
            hint: 'Run migration script: node backend/src/database/migrations/add-cart-specifications.js'
          });
        }
      }
      
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
    cartItem = await database.get(`
      SELECT ci.*, p.stock, p.name
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.id = $1 AND ci.user_id = $2
    `, [itemId, userId]);
  } else {
    cartItem = await database.get(`
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

  await database.execute(
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
    cartItem = await database.get(
      'SELECT id FROM cart_items WHERE id = $1 AND user_id = $2',
      [itemId, userId]
    );
  } else {
    cartItem = await database.get(
      'SELECT id FROM cart_items WHERE id = $1 AND session_id = $2',
      [itemId, sessionId]
    );
  }

  if (!cartItem) {
    throw new NotFoundError('Cart item not found');
  }

  await database.execute('DELETE FROM cart_items WHERE id = $1', [itemId]);

  res.json({
    message: 'Item removed from cart successfully'
  });
});

// Clear entire cart
router.delete('/', optionalAuth, async (req, res) => {
  const { userId, sessionId } = getCartIdentifier(req);

  if (userId) {
    await database.execute('DELETE FROM cart_items WHERE user_id = $1', [userId]);
  } else {
    await database.execute('DELETE FROM cart_items WHERE session_id = $1', [sessionId]);
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
    const dbType = database.getType() || process.env.DB_CLIENT || 'sqlite3';
    const isPostgres = dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql';

    if (isPostgres) {
      // PostgreSQL: use client-based transaction
      const client = await database.beginTransaction();
      try {
        // Get guest cart items
        const guestItemsResult = await client.query(
          'SELECT * FROM cart_items WHERE session_id = $1',
          [sessionId]
        );
        const guestItems = guestItemsResult.rows;

        for (const item of guestItems) {
          // Check if user already has this product in cart with same specifications
          const existingUserItemsResult = await client.query(
            'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2',
            [userId, item.product_id]
          );
          const existingUserItems = existingUserItemsResult.rows;
          
          // Find item with matching specifications
          const existingUserItem = existingUserItems.find(userItem => 
            specsEqual(userItem.specifications, item.specifications)
          );

          if (existingUserItem) {
            // Update quantity (take the maximum) for item with same specifications
            const maxQuantity = Math.max(existingUserItem.quantity, item.quantity);
            await client.query(
              'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
              [maxQuantity, existingUserItem.id]
            );
          } else {
            // Move guest item to user cart
            await client.query(
              'UPDATE cart_items SET user_id = $1, session_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
              [userId, item.id]
            );
          }
        }

        // Clean up any remaining guest items
        await client.query('DELETE FROM cart_items WHERE session_id = $1', [sessionId]);

        await database.commit(client);

        res.json({
          message: 'Cart merged successfully'
        });
      } catch (error) {
        await database.rollback(client);
        throw error;
      }
    } else {
      // SQLite: use simple transaction
      await database.beginTransaction();

      try {
        // Get guest cart items
        const guestItems = await database.query(
          'SELECT * FROM cart_items WHERE session_id = $1',
          [sessionId]
        );

        for (const item of guestItems) {
          // Check if user already has this product in cart with same specifications
          const existingUserItems = await database.query(
            'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2',
            [userId, item.product_id]
          );
          
          // Find item with matching specifications
          const existingUserItem = existingUserItems.find(userItem => 
            specsEqual(userItem.specifications, item.specifications)
          );

          if (existingUserItem) {
            // Update quantity (take the maximum) for item with same specifications
            const maxQuantity = Math.max(existingUserItem.quantity, item.quantity);
            await database.execute(
              'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
              [maxQuantity, existingUserItem.id]
            );
          } else {
            // Move guest item to user cart
            await database.execute(
              'UPDATE cart_items SET user_id = $1, session_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
              [userId, item.id]
            );
          }
        }

        // Clean up any remaining guest items
        await database.execute('DELETE FROM cart_items WHERE session_id = $1', [sessionId]);

        await database.commit();

        res.json({
          message: 'Cart merged successfully'
        });
      } catch (error) {
        await database.rollback();
        throw error;
      }
    }
  } catch (error) {
    console.error('Error merging cart:', error);
    res.status(500).json({ error: error.message || 'Failed to merge cart' });
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

  const [{ count }] = await database.query(countQuery, params);

  res.json({
    sessionId: sessionId || undefined,
    count: parseInt(count)
  });
});

module.exports = router;
