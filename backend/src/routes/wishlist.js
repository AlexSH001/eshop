const express = require('express');
const { database } = require('../database');
const { authenticateUser } = require('../middleware/auth');
const { idValidation, paginationValidation } = require('../middleware/validation');
const { NotFoundError, ConflictError } = require('../middleware/errorHandler');

const router = express.Router();

// Get user's wishlist
router.get('/', authenticateUser, paginationValidation, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const userId = req.user.id;

  const wishlistItems = await database.query(`
    SELECT
      wi.id as wishlist_id,
      wi.created_at as added_at,
      p.*,
      c.name as category_name,
      c.slug as category_slug
    FROM wishlist_items wi
    JOIN products p ON wi.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE wi.user_id = $1 AND p.status = 'active'
    ORDER BY wi.created_at DESC
    LIMIT $2 OFFSET $3
  `, [userId, parseInt(limit), offset]);

  const [{ total }] = await database.query(
    'SELECT COUNT(*) as total FROM wishlist_items wi JOIN products p ON wi.product_id = p.id WHERE wi.user_id = $1 AND p.status = "active"',
    [userId]
  );

  // Format product data
  const formattedItems = wishlistItems.map(item => ({
    wishlistId: item.wishlist_id,
    addedAt: item.added_at,
    product: {
      id: item.id,
      name: item.name,
      slug: item.slug,
      price: item.price,
      originalPrice: item.original_price,
      featuredImage: item.featured_image,
      images: item.images ? JSON.parse(item.images) : [],
      category: {
        id: item.category_id,
        name: item.category_name,
        slug: item.category_slug
      },
      stock: item.stock,
      status: item.status,
      rating: item.rating,
      reviewCount: item.review_count
    }
  }));

  res.json({
    items: formattedItems,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  });
});

// Add product to wishlist
router.post('/items/:productId', authenticateUser, idValidation, async (req, res) => {
  const productId = req.params.productId;
  const userId = req.user.id;

  // Check if product exists
  const product = await database.get(
    'SELECT id, name FROM products WHERE id = $1 AND status = "active"',
    [productId]
  );

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  try {
    // Add to wishlist
    await database.execute(
      'INSERT INTO wishlist_items (user_id, product_id) VALUES ($1, $2)',
      [userId, productId]
    );

    res.status(201).json({
      message: 'Product added to wishlist successfully',
      productId: parseInt(productId)
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new ConflictError('Product is already in your wishlist');
    }
    throw error;
  }
});

// Remove product from wishlist
router.delete('/items/:productId', authenticateUser, idValidation, async (req, res) => {
  const productId = req.params.productId;
  const userId = req.user.id;

  const result = await database.execute(
    'DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2',
    [userId, productId]
  );

  if (result.changes === 0) {
    throw new NotFoundError('Product not found in wishlist');
  }

  res.json({
    message: 'Product removed from wishlist successfully',
    productId: parseInt(productId)
  });
});

// Check if product is in wishlist
router.get('/check/:productId', authenticateUser, idValidation, async (req, res) => {
  const productId = req.params.productId;
  const userId = req.user.id;

  const item = await database.get(
    'SELECT id FROM wishlist_items WHERE user_id = $1 AND product_id = $2',
    [userId, productId]
  );

  res.json({
    inWishlist: !!item,
    productId: parseInt(productId)
  });
});

// Get wishlist count
router.get('/count', authenticateUser, async (req, res) => {
  const userId = req.user.id;

  const [{ count }] = await database.query(
    `SELECT COUNT(*) as count
     FROM wishlist_items wi
     JOIN products p ON wi.product_id = p.id
     WHERE wi.user_id = $1 AND p.status = 'active'`,
    [userId]
  );

  res.json({
    count: parseInt(count)
  });
});

// Move item from wishlist to cart
router.post('/items/:productId/move-to-cart', authenticateUser, idValidation, async (req, res) => {
  const productId = req.params.productId;
  const userId = req.user.id;
  const { quantity = 1 } = req.body;

  // Check if product is in wishlist
  const wishlistItem = await database.get(
    'SELECT id FROM wishlist_items WHERE user_id = $1 AND product_id = $2',
    [userId, productId]
  );

  if (!wishlistItem) {
    throw new NotFoundError('Product not found in wishlist');
  }

  // Get product details
  const product = await database.get(
    'SELECT id, name, price, stock, status FROM products WHERE id = $1 AND status = "active"',
    [productId]
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
    await database.beginTransaction();

    // Check if item already exists in cart
    const existingCartItem = await database.get(
      'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    if (existingCartItem) {
      // Update cart quantity
      const newQuantity = existingCartItem.quantity + quantity;

      if (product.stock < newQuantity) {
        await database.rollback();
        return res.status(400).json({
          error: 'Insufficient stock for requested quantity',
          currentQuantity: existingCartItem.quantity,
          requestedQuantity: quantity,
          availableStock: product.stock
        });
      }

      await database.execute(
        'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newQuantity, existingCartItem.id]
      );
    } else {
      // Add to cart
      await database.execute(
        'INSERT INTO cart_items (user_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [userId, productId, quantity, product.price]
      );
    }

    // Remove from wishlist
    await database.execute(
      'DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    await database.commit();

    res.json({
      message: 'Product moved to cart successfully',
      productId: parseInt(productId),
      quantity
    });
  } catch (error) {
    await database.rollback();
    throw error;
  }
});

// Clear entire wishlist
router.delete('/', authenticateUser, async (req, res) => {
  const userId = req.user.id;

  await database.execute('DELETE FROM wishlist_items WHERE user_id = $1', [userId]);

  res.json({
    message: 'Wishlist cleared successfully'
  });
});

// Get wishlist summary (for dropdown/preview)
router.get('/summary', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const { limit = 5 } = req.query;

  const items = await database.query(`
    SELECT
      p.id,
      p.name,
      p.price,
      p.original_price,
      p.featured_image,
      wi.created_at as added_at
    FROM wishlist_items wi
    JOIN products p ON wi.product_id = p.id
    WHERE wi.user_id = $1 AND p.status = 'active'
    ORDER BY wi.created_at DESC
    LIMIT $2
  `, [userId, parseInt(limit)]);

  const [{ total }] = await database.query(
    `SELECT COUNT(*) as total
     FROM wishlist_items wi
     JOIN products p ON wi.product_id = p.id
     WHERE wi.user_id = $1 AND p.status = 'active'`,
    [userId]
  );

  res.json({
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      originalPrice: item.original_price,
      image: item.featured_image,
      addedAt: item.added_at
    })),
    total: parseInt(total),
    hasMore: total > limit
  });
});

module.exports = router;
