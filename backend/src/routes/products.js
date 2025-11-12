const express = require('express');
const { db } = require('../database');
const { generateSlug, generateSKU } = require('../utils/auth');
const { authenticateAdmin, requireSuperAdmin, optionalAuth } = require('../middleware/auth');
const {
  createProductValidation,
  updateProductValidation,
  idValidation,
  paginationValidation
} = require('../middleware/validation');
const { NotFoundError } = require('../middleware/errorHandler');

const router = express.Router();

// Ensure slug is unique by suffixing -2, -3, ... if needed
async function ensureUniqueSlug(baseSlug) {
  const existing = await db.query(
    'SELECT slug FROM products WHERE slug = $1 OR slug LIKE $2',
    [baseSlug, `${baseSlug}-%`]
  );

  if (!existing || existing.length === 0) {
    return baseSlug;
  }

  const existingSet = new Set(existing.map(row => row.slug));
  if (!existingSet.has(baseSlug)) {
    return baseSlug;
  }

  let maxSuffix = 1;
  for (const s of existingSet) {
    if (s.startsWith(`${baseSlug}-`)) {
      const part = s.slice(baseSlug.length + 1);
      const num = parseInt(part, 10);
      if (!Number.isNaN(num)) {
        if (num >= maxSuffix) maxSuffix = num + 1;
      }
    }
  }
  return `${baseSlug}-${maxSuffix}`;
}

// Ensure SKU is unique by suffixing -2, -3, ... if needed
async function ensureUniqueSku(baseSku) {
  const existing = await db.query(
    'SELECT sku FROM products WHERE sku = $1 OR sku LIKE $2',
    [baseSku, `${baseSku}-%`]
  );

  if (!existing || existing.length === 0) {
    return baseSku;
  }

  const existingSet = new Set(existing.map(row => row.sku));
  if (!existingSet.has(baseSku)) {
    return baseSku;
  }

  let maxSuffix = 1;
  for (const s of existingSet) {
    if (s.startsWith(`${baseSku}-`)) {
      const part = s.slice(baseSku.length + 1);
      const num = parseInt(part, 10);
      if (!Number.isNaN(num)) {
        if (num >= maxSuffix) maxSuffix = num + 1;
      }
    }
  }
  return `${baseSku}-${maxSuffix}`;
}

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
    whereConditions.push(`p.status = $${params.length + 1}`);
    params.push(status);
  }

  // Category filter
  if (category) {
    whereConditions.push(`p.category_id = $${params.length + 1}`);
    params.push(category);
  }

  // Featured filter
  if (featured === 'true') {
    whereConditions.push('p.is_featured = TRUE');
  }

  // Search filter
  if (search) {
    whereConditions.push(`(p.name LIKE $${params.length + 1} OR p.description LIKE $${params.length + 2} OR p.tags LIKE $${params.length + 3})`);
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  // Price range filter
  if (minPrice) {
    whereConditions.push(`p.price >= $${params.length + 1}`);
    params.push(minPrice);
  }
  if (maxPrice) {
    whereConditions.push(`p.price <= $${params.length + 1}`);
    params.push(maxPrice);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Validate sort column
  const validSortColumns = ['name', 'price', 'created_at', 'sales_count', 'rating'];
  const validSortOrder = ['ASC', 'DESC'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const sortDirection = validSortOrder.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

  // Get products with proper parameterization
  let query = `
    SELECT
      p.*,
      c.name as category_name,
      c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${whereClause}
  `;
  
  // Add ORDER BY clause based on sort parameters
  if (sortColumn === 'name') {
    query += ` ORDER BY p.name ${sortDirection}`;
  } else if (sortColumn === 'price') {
    query += ` ORDER BY p.price ${sortDirection}`;
  } else if (sortColumn === 'created_at') {
    query += ` ORDER BY p.created_at ${sortDirection}`;
  } else if (sortColumn === 'sales_count') {
    query += ` ORDER BY p.sales_count ${sortDirection}`;
  } else if (sortColumn === 'rating') {
    query += ` ORDER BY p.rating ${sortDirection}`;
  } else {
    query += ` ORDER BY p.created_at DESC`;
  }
  
  query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const products = await db.query(query, [...params, parseInt(limit), offset]);

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${whereClause}
  `;
  const [{ total }] = await db.query(countQuery, params);

  // Format product data
  const formattedProducts = products.map(product => ({
    ...product,
    images: product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [],
    tags: product.tags ? (typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags) : [],
    attributes: product.attributes ? (typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes) : {},
    dimensions: product.dimensions ? (typeof product.dimensions === 'string' ? JSON.parse(product.dimensions) : product.dimensions) : null
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
  await db.execute(
    'UPDATE products SET view_count = view_count + 1 WHERE id = $1',
    [productId]
  );

  const product = await db.get(`
    SELECT
      p.*,
      c.name as category_name,
      c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = $1
  `, [productId]);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // Format product data
  const formattedProduct = {
    ...product,
    images: product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [],
    tags: product.tags ? (typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags) : [],
    attributes: product.attributes ? (typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes) : {},
    dimensions: product.dimensions ? (typeof product.dimensions === 'string' ? JSON.parse(product.dimensions) : product.dimensions) : null,
    inStock: product.stock > 0,
    stockCount: product.stock,
    specifications: product.specifications ? (typeof product.specifications === 'string' ? JSON.parse(product.specifications) : product.specifications) : {},
    shipping: product.shipping || ''
  };

  // Get related products
  const relatedProducts = await db.query(`
    SELECT id, name, price, original_price, featured_image, category_id
    FROM products
    WHERE category_id = $1 AND id != $2 AND status = 'active'
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

  // Build query with proper ORDER BY handling
  let query = `
    SELECT
      p.*,
      c.name as category_name,
      c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.category_id = $1 AND p.status = 'active'
  `;
  
  // Add ORDER BY clause based on sort parameters
  if (sortColumn === 'name') {
    query += ` ORDER BY p.name ${sortDirection}`;
  } else if (sortColumn === 'price') {
    query += ` ORDER BY p.price ${sortDirection}`;
  } else if (sortColumn === 'created_at') {
    query += ` ORDER BY p.created_at ${sortDirection}`;
  } else if (sortColumn === 'sales_count') {
    query += ` ORDER BY p.sales_count ${sortDirection}`;
  } else if (sortColumn === 'rating') {
    query += ` ORDER BY p.rating ${sortDirection}`;
  } else {
    query += ` ORDER BY p.created_at DESC`;
  }
  
  query += ` LIMIT $2 OFFSET $3`;

  const products = await db.query(query, [categoryId, parseInt(limit), offset]);

  const [{ total }] = await db.query(
    'SELECT COUNT(*) as total FROM products WHERE category_id = $1 AND status = \'active\'',
    [categoryId]
  );

  // Format products
  const formattedProducts = products.map(product => ({
    ...product,
    images: product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [],
    tags: product.tags ? (typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags) : [],
    attributes: product.attributes ? (typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes) : {}
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

  const products = await db.query(`
    SELECT
      p.*,
      c.name as category_name,
      c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_featured = TRUE AND p.status = 'active'
    ORDER BY p.sales_count DESC, p.created_at DESC
    LIMIT $1
  `, [parseInt(limit)]);

  const formattedProducts = products.map(product => ({
    ...product,
    images: product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [],
    tags: product.tags ? (typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags) : [],
    attributes: product.attributes ? (typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes) : {}
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

  // Generate slug and ensure uniqueness
  const slug = await ensureUniqueSlug(generateSlug(name));

  // Get category name for SKU generation
  const category = await db.get('SELECT name FROM categories WHERE id = $1', [finalCategoryId]);
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  const sku = await ensureUniqueSku(generateSKU(category.name, name));

  // Create product
  const result = await db.execute(`
    INSERT INTO products (
      name, slug, description, short_description, sku, price, original_price,
      category_id, stock, weight, dimensions, images, featured_image, tags,
      attributes, status, is_featured, meta_title, meta_description,
      specifications, shipping
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    RETURNING id
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

  const insertedId = result.id || (result.rows && result.rows[0] && result.rows[0].id);
  const product = await db.get('SELECT * FROM products WHERE id = $1', [insertedId]);

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

  // Generate slug and ensure uniqueness
  const slug = await ensureUniqueSlug(generateSlug(name));

  // Get category name for SKU generation
  const category = await db.get('SELECT name FROM categories WHERE id = $1', [categoryId]);
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  const sku = await ensureUniqueSku(generateSKU(category.name, name));

  // Create product
  const result = await db.execute(`
    INSERT INTO products (
      name, slug, description, short_description, sku, price, original_price,
      category_id, stock, weight, dimensions, images, featured_image, tags,
      attributes, status, is_featured, meta_title, meta_description,
      specifications, shipping
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    RETURNING id
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

  const insertedId = result.id || (result.rows && result.rows[0] && result.rows[0].id);
  const product = await db.get('SELECT * FROM products WHERE id = $1', [insertedId]);

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
  const existingProduct = await db.get('SELECT * FROM products WHERE id = $1', [productId]);
  if (!existingProduct) {
    throw new NotFoundError('Product not found');
  }

  const updates = [];
  const params = [];

  // Handle categoryId or category_id field
  const categoryId = req.body.categoryId || req.body.category_id;

  // Debug: Log the request body
  console.log('Product update request body:', req.body);
  console.log('Featured image from request (featuredImage):', req.body.featuredImage);
  console.log('Featured image from request (featured_image):', req.body.featured_image);

  // Build dynamic update query
  const allowedFields = [
    'name', 'description', 'short_description', 'price', 'original_price',
    'stock', 'weight', 'dimensions', 'images', 'featured_image',
    'tags', 'attributes', 'status', 'is_featured', 'meta_title', 'meta_description',
    'specifications', 'shipping'
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      console.log(`Updating field ${field} with value:`, req.body[field]);
      if (['dimensions', 'images', 'tags', 'attributes'].includes(field)) {
        updates.push(`${field} = $${params.length + 1}`);
        params.push(JSON.stringify(req.body[field]));
      } else if (field === 'specifications' && req.body[field] !== undefined) {
        updates.push(`${field} = $${params.length + 1}`);
        params.push(JSON.stringify(req.body[field]));
      } else if (field === 'shipping' && req.body[field] !== undefined) {
        updates.push(`${field} = $${params.length + 1}`);
        params.push(req.body[field]);
      } else {
        updates.push(`${field} = $${params.length + 1}`);
        params.push(req.body[field]);
      }
    }
  }

  // Handle category update separately
  if (categoryId !== undefined) {
    updates.push('category_id = $' + (params.length + 1));
    params.push(categoryId);
  }

  // Update slug if name changed
  if (req.body.name) {
    updates.push('slug = $' + (params.length + 1));
    params.push(generateSlug(req.body.name));
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(productId);

  const sqlQuery = `UPDATE products SET ${updates.join(', ')} WHERE id = $${params.length}`;
  console.log('Executing SQL query:', sqlQuery);
  console.log('Query parameters:', params);

  await db.execute(sqlQuery, params);

  const updatedProduct = await db.get('SELECT * FROM products WHERE id = $1', [productId]);

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

// Delete product (Super Admin only)
router.delete('/:id', authenticateAdmin, requireSuperAdmin, idValidation, async (req, res) => {
  const productId = req.params.id;

  const product = await db.get('SELECT id, featured_image, images FROM products WHERE id = $1', [productId]);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // Move images to deleted folder before deleting product
  try {
    const fs = require('fs');
    const path = require('path');
    const deletedDir = path.join(__dirname, '../../uploads/products/_DELETED');
    
    // Create deleted directory if it doesn't exist
    if (!fs.existsSync(deletedDir)) {
      fs.mkdirSync(deletedDir, { recursive: true });
    }

    // Move featured image
    if (product.featured_image) {
      const featuredImagePath = path.join(__dirname, '../../uploads', product.featured_image.replace('/uploads/', ''));
      if (fs.existsSync(featuredImagePath)) {
        const deletedFeaturedPath = path.join(deletedDir, path.basename(featuredImagePath));
        fs.renameSync(featuredImagePath, deletedFeaturedPath);
        console.log(`Moved featured image to deleted folder: ${deletedFeaturedPath}`);
      }
    }

    // Move all images from images array
    if (product.images) {
      try {
        const images = JSON.parse(product.images);
        images.forEach((imageUrl) => {
          const imagePath = path.join(__dirname, '../../uploads', imageUrl.replace('/uploads/', ''));
          if (fs.existsSync(imagePath)) {
            const deletedImagePath = path.join(deletedDir, path.basename(imagePath));
            fs.renameSync(imagePath, deletedImagePath);
            console.log(`Moved image to deleted folder: ${deletedImagePath}`);
          }
        });
      } catch (e) {
        console.error('Error parsing images JSON:', e);
      }
    }
  } catch (error) {
    console.error('Error moving images to deleted folder:', error);
    // Continue with product deletion even if image cleanup fails
  }

  await db.execute('DELETE FROM products WHERE id = $1', [productId]);

  res.json({
    message: 'Product deleted successfully'
  });
});

// Get single product by ID
router.get('/:id', idValidation, async (req, res) => {
  const productId = req.params.id;

  const product = await db.get('SELECT * FROM products WHERE id = $1', [productId]);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  res.json({
    product: {
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      tags: product.tags ? JSON.parse(product.tags) : [],
      attributes: product.attributes ? JSON.parse(product.attributes) : {},
      dimensions: product.dimensions ? JSON.parse(product.dimensions) : null,
      specifications: product.specifications ? JSON.parse(product.specifications) : {},
      shipping: product.shipping || ''
    }
  });
});

// Get categories
router.get('/categories/list', async (req, res) => {
  const categories = await db.query(`
    SELECT * FROM categories
    WHERE is_active = TRUE
    ORDER BY sort_order ASC, name ASC
  `);

  res.json({
    categories
  });
});

module.exports = router;
