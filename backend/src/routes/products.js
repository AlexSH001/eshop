const express = require('express');
const { database } = require('../database/init');
const { generateSlug, generateSKU } = require('../utils/auth');
const { authenticateAdmin, optionalAuth } = require('../middleware/auth');
const {
  createProductValidation,
  updateProductValidation,
  idValidation,
  paginationValidation
} = require('../middleware/validation');
const { NotFoundError } = require('../middleware/errorHandler');

const router = express.Router();

// Get all products with filtering and pagination
router.get('/', paginationValidation, async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    status = 'active',
    featured,
    search,
    minPrice,
    maxPrice,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = req.query;

  const offset = (page - 1) * limit;

  let whereConditions = [];
  let params = [];

  // Base condition for status
  if (status !== 'all') {
    whereConditions.push('p.status = ?');
    params.push(status);
  }

  // Category filter
  if (category) {
    whereConditions.push('p.category_id = ?');
    params.push(category);
  }

  // Featured filter
  if (featured === 'true') {
    whereConditions.push('p.is_featured = TRUE');
  }

  // Search filter
  if (search) {
    whereConditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  // Price range filter
  if (minPrice) {
    whereConditions.push('p.price >= ?');
    params.push(minPrice);
  }
  if (maxPrice) {
    whereConditions.push('p.price <= ?');
    params.push(maxPrice);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Validate sort column
  const validSortColumns = ['name', 'price', 'created_at', 'sales_count', 'rating'];
  const validSortOrder = ['ASC', 'DESC'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const sortDirection = validSortOrder.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

  // Get products
  const query = `
    SELECT
      p.*,
      c.name as category_name,
      c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${whereClause}
    ORDER BY p.${sortColumn} ${sortDirection}
    LIMIT ? OFFSET ?
  `;

  const products = await database.query(query, [...params, parseInt(limit), offset]);

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${whereClause}
  `;
  const [{ total }] = await database.query(countQuery, params);

  // Format product data
  const formattedProducts = products.map(product => ({
    ...product,
    images: product.images ? JSON.parse(product.images) : [],
    tags: product.tags ? JSON.parse(product.tags) : [],
    attributes: product.attributes ? JSON.parse(product.attributes) : {},
    dimensions: product.dimensions ? JSON.parse(product.dimensions) : null
  }));

  res.json({
    products: formattedProducts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  });
});

// Get single product
router.get('/:id', idValidation, optionalAuth, async (req, res) => {
  const productId = req.params.id;

  // Increment view count
  await database.execute(
    'UPDATE products SET view_count = view_count + 1 WHERE id = ?',
    [productId]
  );

  const product = await database.get(`
    SELECT
      p.*,
      c.name as category_name,
      c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `, [productId]);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // Format product data
  const formattedProduct = {
    ...product,
    images: product.images ? JSON.parse(product.images) : [],
    tags: product.tags ? JSON.parse(product.tags) : [],
    attributes: product.attributes ? JSON.parse(product.attributes) : {},
    dimensions: product.dimensions ? JSON.parse(product.dimensions) : null,
    inStock: product.stock > 0,
    stockCount: product.stock,
    specifications: product.specifications ? JSON.parse(product.specifications) : {},
    shipping: product.shipping || ''
  };

  // Get related products
  const relatedProducts = await database.query(`
    SELECT id, name, price, original_price, featured_image, category_id
    FROM products
    WHERE category_id = ? AND id != ? AND status = 'active'
    ORDER BY sales_count DESC
    LIMIT 4
  `, [product.category_id, productId]);

  res.json({
    product: formattedProduct,
    relatedProducts
  });
});

// Get products by category
router.get('/category/:categoryId', paginationValidation, async (req, res) => {
  const { categoryId } = req.params;
  const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
  const offset = (page - 1) * limit;

  // Validate sort
  const validSortColumns = ['name', 'price', 'created_at', 'sales_count', 'rating'];
  const validSortOrder = ['ASC', 'DESC'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const sortDirection = validSortOrder.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

  const products = await database.query(`
    SELECT
      p.*,
      c.name as category_name,
      c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.category_id = ? AND p.status = 'active'
    ORDER BY p.${sortColumn} ${sortDirection}
    LIMIT ? OFFSET ?
  `, [categoryId, parseInt(limit), offset]);

  const [{ total }] = await database.query(
    'SELECT COUNT(*) as total FROM products WHERE category_id = ? AND status = "active"',
    [categoryId]
  );

  // Format products
  const formattedProducts = products.map(product => ({
    ...product,
    images: product.images ? JSON.parse(product.images) : [],
    tags: product.tags ? JSON.parse(product.tags) : [],
    attributes: product.attributes ? JSON.parse(product.attributes) : {}
  }));

  res.json({
    products: formattedProducts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  });
});

// Get featured products
router.get('/featured/list', async (req, res) => {
  const { limit = 8 } = req.query;

  const products = await database.query(`
    SELECT
      p.*,
      c.name as category_name,
      c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_featured = TRUE AND p.status = 'active'
    ORDER BY p.sales_count DESC, p.created_at DESC
    LIMIT ?
  `, [parseInt(limit)]);

  const formattedProducts = products.map(product => ({
    ...product,
    images: product.images ? JSON.parse(product.images) : [],
    tags: product.tags ? JSON.parse(product.tags) : [],
    attributes: product.attributes ? JSON.parse(product.attributes) : {}
  }));

  res.json({
    products: formattedProducts
  });
});

// Create product (public for admin portal)
router.post('/', createProductValidation, async (req, res) => {
  const {
    name,
    description,
    shortDescription,
    price,
    originalPrice,
    categoryId,
    category_id,
    stock = 0,
    weight,
    dimensions,
    images = [],
    featuredImage,
    tags = [],
    attributes = {},
    status = 'active',
    isFeatured = false,
    metaTitle,
    metaDescription,
    specifications = {},
    shipping = ''
  } = req.body;

  // Use categoryId or category_id, default to first available category if not provided
  const finalCategoryId = categoryId || category_id;

  // Generate slug and SKU
  const slug = generateSlug(name);

  // Get category name for SKU generation
  const category = await database.get('SELECT name FROM categories WHERE id = ?', [finalCategoryId]);
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  const sku = generateSKU(category.name, name);

  // Create product
  const result = await database.execute(`
    INSERT INTO products (
      name, slug, description, short_description, sku, price, original_price,
      category_id, stock, weight, dimensions, images, featured_image, tags,
      attributes, status, is_featured, meta_title, meta_description,
      specifications, shipping
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    name,
    slug,
    description,
    shortDescription,
    sku,
    price,
    originalPrice || null,
    finalCategoryId,
    stock,
    weight || null,
    dimensions ? JSON.stringify(dimensions) : null,
    JSON.stringify(images),
    featuredImage || null,
    JSON.stringify(tags),
    JSON.stringify(attributes),
    status,
    isFeatured,
    metaTitle || name,
    metaDescription || shortDescription,
    JSON.stringify(specifications),
    shipping
  ]);

  const product = await database.get('SELECT * FROM products WHERE id = ?', [result.id]);

  res.status(201).json({
    message: 'Product created successfully',
    product: {
      ...product,
      images: JSON.parse(product.images),
      tags: JSON.parse(product.tags),
      attributes: JSON.parse(product.attributes),
      dimensions: product.dimensions ? JSON.parse(product.dimensions) : null,
      specifications: product.specifications ? JSON.parse(product.specifications) : {},
      shipping: product.shipping || ''
    }
  });
});

// Admin: Create product (authenticated)
router.post('/authenticated', authenticateAdmin, createProductValidation, async (req, res) => {
  const {
    name,
    description,
    shortDescription,
    price,
    originalPrice,
    categoryId,
    stock = 0,
    weight,
    dimensions,
    images = [],
    featuredImage,
    tags = [],
    attributes = {},
    status = 'active',
    isFeatured = false,
    metaTitle,
    metaDescription,
    specifications = {},
    shipping = ''
  } = req.body;

  // Generate slug and SKU
  const slug = generateSlug(name);

  // Get category name for SKU generation
  const category = await database.get('SELECT name FROM categories WHERE id = ?', [categoryId]);
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  const sku = generateSKU(category.name, name);

  // Create product
  const result = await database.execute(`
    INSERT INTO products (
      name, slug, description, short_description, sku, price, original_price,
      category_id, stock, weight, dimensions, images, featured_image, tags,
      attributes, status, is_featured, meta_title, meta_description,
      specifications, shipping
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    name,
    slug,
    description,
    shortDescription,
    sku,
    price,
    originalPrice || null,
    categoryId,
    stock,
    weight || null,
    dimensions ? JSON.stringify(dimensions) : null,
    JSON.stringify(images),
    featuredImage || null,
    JSON.stringify(tags),
    JSON.stringify(attributes),
    status,
    isFeatured,
    metaTitle || name,
    metaDescription || shortDescription,
    JSON.stringify(specifications),
    shipping
  ]);

  const product = await database.get('SELECT * FROM products WHERE id = ?', [result.id]);

  res.status(201).json({
    message: 'Product created successfully',
    product: {
      ...product,
      images: JSON.parse(product.images),
      tags: JSON.parse(product.tags),
      attributes: JSON.parse(product.attributes),
      dimensions: product.dimensions ? JSON.parse(product.dimensions) : null,
      specifications: product.specifications ? JSON.parse(product.specifications) : {},
      shipping: product.shipping || ''
    }
  });
});

// Update product (public for admin portal)
router.put('/:id', updateProductValidation, async (req, res) => {
  const productId = req.params.id;

  // Check if product exists
  const existingProduct = await database.get('SELECT * FROM products WHERE id = ?', [productId]);
  if (!existingProduct) {
    throw new NotFoundError('Product not found');
  }

  const updates = [];
  const params = [];

  // Handle categoryId or category_id field
  const categoryId = req.body.categoryId || req.body.category_id;

  // Build dynamic update query
  const allowedFields = [
    'name', 'description', 'short_description', 'price', 'original_price',
    'stock', 'weight', 'dimensions', 'images', 'featured_image',
    'tags', 'attributes', 'status', 'is_featured', 'meta_title', 'meta_description',
    'specifications', 'shipping'
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      if (['dimensions', 'images', 'tags', 'attributes'].includes(field)) {
        updates.push(`${field} = ?`);
        params.push(JSON.stringify(req.body[field]));
      } else if (field === 'specifications' && req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(JSON.stringify(req.body[field]));
      } else if (field === 'shipping' && req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      } else {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }
  }

  // Handle category update separately
  if (categoryId !== undefined) {
    updates.push('category_id = ?');
    params.push(categoryId);
  }

  // Update slug if name changed
  if (req.body.name) {
    updates.push('slug = ?');
    params.push(generateSlug(req.body.name));
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(productId);

  await database.execute(
    `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  const updatedProduct = await database.get('SELECT * FROM products WHERE id = ?', [productId]);

  res.json({
    message: 'Product updated successfully',
    product: {
      ...updatedProduct,
      images: JSON.parse(updatedProduct.images),
      tags: JSON.parse(updatedProduct.tags),
      attributes: JSON.parse(updatedProduct.attributes),
      dimensions: updatedProduct.dimensions ? JSON.parse(updatedProduct.dimensions) : null,
      specifications: updatedProduct.specifications ? JSON.parse(updatedProduct.specifications) : {},
      shipping: updatedProduct.shipping || ''
    }
  });
});

// Delete product (public for admin portal)
router.delete('/:id', idValidation, async (req, res) => {
  const productId = req.params.id;

  const product = await database.get('SELECT id FROM products WHERE id = ?', [productId]);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  await database.execute('DELETE FROM products WHERE id = ?', [productId]);

  res.json({
    message: 'Product deleted successfully'
  });
});

// Get categories
router.get('/categories/list', async (req, res) => {
  const categories = await database.query(`
    SELECT * FROM categories
    WHERE is_active = TRUE
    ORDER BY sort_order ASC, name ASC
  `);

  res.json({
    categories
  });
});

module.exports = router;
