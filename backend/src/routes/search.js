const express = require('express');
const { database } = require('../database');
const { optionalAuth } = require('../middleware/auth');
const { searchValidation } = require('../middleware/validation');

const router = express.Router();

// Search products
router.get('/', optionalAuth, searchValidation, async (req, res) => {
  const {
    q: query,
    category,
    minPrice,
    maxPrice,
    page = 1,
    limit = 20,
    sortBy = 'relevance',
    sortOrder = 'DESC'
  } = req.query;

  const offset = (page - 1) * limit;
  const userId = req.user ? req.user.id : null;

  // Log search if user is authenticated or has session
  const sessionId = req.headers['x-session-id'];
  if (userId || sessionId) {
    await database.execute(
      'INSERT INTO search_history (user_id, session_id, search_term) VALUES ($1, $2, $3)',
      [userId, sessionId || null, query]
    ).catch(() => {}); // Ignore errors for search logging
  }

  let whereConditions = ['p.status = "active"'];
  let params = [];

  // Search in name, description, and tags
  whereConditions.push(`(
    p.name LIKE $1 OR
    p.description LIKE $2 OR
    p.short_description LIKE $3 OR
    p.tags LIKE $4 OR
    c.name LIKE $5
  )`);
  const searchTerm = `%${query}%`;
  params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);

  // Category filter
  if (category) {
    whereConditions.push('p.category_id = $6');
    params.push(category);
  }

  // Price range filters
  if (minPrice) {
    whereConditions.push('p.price >= $7');
    params.push(minPrice);
  }
  if (maxPrice) {
    whereConditions.push('p.price <= $8');
    params.push(maxPrice);
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  // Determine sort order
  let orderClause;
  switch (sortBy) {
    case 'price_low':
      orderClause = 'ORDER BY p.price ASC';
      break;
    case 'price_high':
      orderClause = 'ORDER BY p.price DESC';
      break;
    case 'name':
      orderClause = `ORDER BY p.name ${sortOrder}`;
      break;
    case 'newest':
      orderClause = 'ORDER BY p.created_at DESC';
      break;
    case 'rating':
      orderClause = 'ORDER BY p.rating DESC, p.review_count DESC';
      break;
    case 'popularity':
      orderClause = 'ORDER BY p.sales_count DESC, p.view_count DESC';
      break;
    case 'relevance':
    default:
      // Relevance-based sorting (name match > description match)
      orderClause = `ORDER BY
        CASE
          WHEN p.name LIKE $9 THEN 1
          WHEN p.short_description LIKE $10 THEN 2
          WHEN p.description LIKE $11 THEN 3
          WHEN p.tags LIKE $12 THEN 4
          WHEN c.name LIKE $13 THEN 5
          ELSE 6
        END,
        p.sales_count DESC,
        p.rating DESC`;
      params = [...params, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
      break;
  }

  // Get products
  const searchQuery = `
    SELECT
      p.*,
      c.name as category_name,
      c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${whereClause}
    ${orderClause}
    LIMIT $14 OFFSET $15
  `;

  const products = await database.query(searchQuery, [...params, parseInt(limit), offset]);

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${whereClause}
  `;
  const countParams = params.slice(0, sortBy === 'relevance' ? params.length - 5 : params.length);
  const [{ total }] = await database.query(countQuery, countParams);

  // Update results count in search history
  if (userId || sessionId) {
    await database.execute(
      `UPDATE search_history
       SET results_count = $16
       WHERE (user_id = $17 OR session_id = $18) AND search_term = $19
       ORDER BY created_at DESC LIMIT 1`,
      [total, userId, sessionId || null, query]
    ).catch(() => {});
  }

  // Format product data
  const formattedProducts = products.map(product => ({
    ...product,
    images: product.images ? JSON.parse(product.images) : [],
    tags: product.tags ? JSON.parse(product.tags) : [],
    attributes: product.attributes ? JSON.parse(product.attributes) : {}
  }));

  res.json({
    query,
    products: formattedProducts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    },
    filters: {
      categories: await getAvailableCategories(query),
      priceRange: await getPriceRange(query)
    }
  });
});

// Get search suggestions (autocomplete)
router.get('/suggestions', optionalAuth, async (req, res) => {
  const { q: query, limit = 10 } = req.query;

  if (!query || query.length < 2) {
    return res.json({ suggestions: [] });
  }

  const searchTerm = `%${query}%`;

  // Get product name suggestions
  const productSuggestions = await database.query(`
    SELECT DISTINCT name
    FROM products
    WHERE name LIKE $1 AND status = 'active'
    ORDER BY sales_count DESC, name ASC
    LIMIT $2
  `, [searchTerm, Math.floor(limit * 0.7)]);

  // Get category suggestions
  const categorySuggestions = await database.query(`
    SELECT DISTINCT name
    FROM categories
    WHERE name LIKE $1 AND is_active = TRUE
    ORDER BY name ASC
    LIMIT $2
  `, [searchTerm, Math.floor(limit * 0.3)]);

  const suggestions = [
    ...productSuggestions.map(p => ({ type: 'product', text: p.name })),
    ...categorySuggestions.map(c => ({ type: 'category', text: c.name }))
  ].slice(0, limit);

  res.json({ suggestions });
});

// Get popular search terms
router.get('/popular', async (req, res) => {
  const { limit = 10 } = req.query;

  const popularSearches = await database.query(`
    SELECT
      search_term,
      COUNT(*) as search_count,
      AVG(results_count) as avg_results
    FROM search_history
    WHERE created_at >= datetime('now', '-30 days')
      AND results_count > 0
    GROUP BY search_term
    ORDER BY search_count DESC, avg_results DESC
    LIMIT $1
  `, [parseInt(limit)]);

  res.json({
    popular: popularSearches.map(s => ({
      term: s.search_term,
      count: s.search_count,
      avgResults: Math.round(s.avg_results)
    }))
  });
});

// Get user's recent searches
router.get('/recent', optionalAuth, async (req, res) => {
  const { limit = 10 } = req.query;
  const userId = req.user ? req.user.id : null;
  const sessionId = req.headers['x-session-id'];

  if (!userId && !sessionId) {
    return res.json({ recent: [] });
  }

  const recentSearches = await database.query(`
    SELECT DISTINCT search_term, MAX(created_at) as last_searched
    FROM search_history
    WHERE (user_id = $1 OR session_id = $2)
    GROUP BY search_term
    ORDER BY last_searched DESC
    LIMIT $3
  `, [userId, sessionId || null, parseInt(limit)]);

  res.json({
    recent: recentSearches.map(s => ({
      term: s.search_term,
      lastSearched: s.last_searched
    }))
  });
});

// Clear user's search history
router.delete('/history', optionalAuth, async (req, res) => {
  const userId = req.user ? req.user.id : null;
  const sessionId = req.headers['x-session-id'];

  if (!userId && !sessionId) {
    return res.status(400).json({ error: 'No search history to clear' });
  }

  await database.execute(
    'DELETE FROM search_history WHERE user_id = $1 OR session_id = $2',
    [userId, sessionId || null]
  );

  res.json({ message: 'Search history cleared successfully' });
});

// Search within category
router.get('/category/:categoryId', optionalAuth, async (req, res) => {
  const { categoryId } = req.params;
  const { q: query, page = 1, limit = 20, sortBy = 'relevance' } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const offset = (page - 1) * limit;
  const searchTerm = `%${query}%`;

  let orderClause;
  let params = [categoryId, searchTerm, searchTerm, searchTerm, searchTerm];

  if (sortBy === 'relevance') {
    orderClause = `ORDER BY
      CASE
        WHEN p.name LIKE $6 THEN 1
        WHEN p.short_description LIKE $7 THEN 2
        WHEN p.description LIKE $8 THEN 3
        WHEN p.tags LIKE $9 THEN 4
        ELSE 5
      END,
      p.sales_count DESC`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  } else {
    orderClause = 'ORDER BY p.created_at DESC';
  }

  const products = await database.query(`
    SELECT
      p.*,
      c.name as category_name,
      c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.category_id = $1
      AND p.status = 'active'
      AND (p.name LIKE $2 OR p.description LIKE $3 OR p.short_description LIKE $4 OR p.tags LIKE $5)
    ${orderClause}
    LIMIT $10 OFFSET $11
  `, [...params, parseInt(limit), offset]);

  const [{ total }] = await database.query(`
    SELECT COUNT(*) as total
    FROM products p
    WHERE p.category_id = $1
      AND p.status = 'active'
      AND (p.name LIKE $2 OR p.description LIKE $3 OR p.short_description LIKE $4 OR p.tags LIKE $5)
  `, [categoryId, searchTerm, searchTerm, searchTerm, searchTerm]);

  const formattedProducts = products.map(product => ({
    ...product,
    images: product.images ? JSON.parse(product.images) : [],
    tags: product.tags ? JSON.parse(product.tags) : [],
    attributes: product.attributes ? JSON.parse(product.attributes) : {}
  }));

  res.json({
    query,
    categoryId: parseInt(categoryId),
    products: formattedProducts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  });
});

// Helper functions
async function getAvailableCategories(query) {
  const searchTerm = `%${query}%`;

  return await database.query(`
    SELECT DISTINCT c.id, c.name, COUNT(p.id) as product_count
    FROM categories c
    JOIN products p ON c.id = p.category_id
    WHERE p.status = 'active'
      AND (p.name LIKE $1 OR p.description LIKE $2 OR p.tags LIKE $3)
    GROUP BY c.id, c.name
    ORDER BY product_count DESC, c.name ASC
  `, [searchTerm, searchTerm, searchTerm]);
}

async function getPriceRange(query) {
  const searchTerm = `%${query}%`;

  const [result] = await database.query(`
    SELECT
      MIN(price) as min_price,
      MAX(price) as max_price
    FROM products
    WHERE status = 'active'
      AND (name LIKE $1 OR description LIKE $2 OR tags LIKE $3)
  `, [searchTerm, searchTerm, searchTerm]);

  return {
    min: Math.floor(result.min_price || 0),
    max: Math.ceil(result.max_price || 0)
  };
}

module.exports = router;
