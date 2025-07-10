const express = require('express');
const { database } = require('../database/init');
const { authenticateAdmin } = require('../middleware/auth');
const { idValidation, paginationValidation } = require('../middleware/validation');
const { NotFoundError } = require('../middleware/errorHandler');

const router = express.Router();

// Get all categories (public)
router.get('/', async (req, res) => {
  const categories = await database.query(`
    SELECT id, name, slug, description, icon, image, parent_id, sort_order
    FROM categories
    WHERE is_active = TRUE
    ORDER BY sort_order ASC, name ASC
  `);

  res.json({
    categories
  });
});

// Get categories for admin product form (public)
router.get('/list', async (req, res) => {
  const categories = await database.query(`
    SELECT id, name, slug, description, icon
    FROM categories
    WHERE is_active = TRUE
    ORDER BY sort_order ASC, name ASC
  `);

  res.json({
    categories
  });
});

// Get single category (public)
router.get('/:id', idValidation, async (req, res) => {
  const categoryId = req.params.id;

  const category = await database.get(`
    SELECT * FROM categories
    WHERE id = ? AND is_active = TRUE
  `, [categoryId]);

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  // Get products in this category
  const products = await database.query(`
    SELECT id, name, price, original_price, featured_image, stock, status
    FROM products
    WHERE category_id = ? AND status = 'active'
    ORDER BY is_featured DESC, created_at DESC
    LIMIT 20
  `, [categoryId]);

  res.json({
    category,
    products
  });
});

// Admin: Get all categories with pagination
router.get('/admin/list', authenticateAdmin, paginationValidation, async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    status = 'all',
    sortBy = 'sort_order',
    sortOrder = 'ASC'
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
    whereConditions.push('(name LIKE ? OR description LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Validate sort
  const validSortColumns = ['name', 'sort_order', 'created_at'];
  const validSortOrder = ['ASC', 'DESC'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'sort_order';
  const sortDirection = validSortOrder.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';

  const categories = await database.query(`
    SELECT 
      c.*,
      COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active'
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.${sortColumn} ${sortDirection}
    LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), offset]);

  const [{ total }] = await database.query(`
    SELECT COUNT(*) as total FROM categories ${whereClause}
  `, params);

  res.json({
    categories,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  });
});

// Admin: Create category
router.post('/', authenticateAdmin, async (req, res) => {
  const {
    name,
    description,
    icon,
    image,
    parentId,
    sortOrder = 0
  } = req.body;

  // Validate required fields
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  // Check if category with same name exists
  const existingCategory = await database.get(
    'SELECT id FROM categories WHERE name = ?',
    [name]
  );

  if (existingCategory) {
    return res.status(409).json({ error: 'Category with this name already exists' });
  }

  // Generate slug from name
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // Create category
  const result = await database.execute(`
    INSERT INTO categories (name, slug, description, icon, image, parent_id, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [name, slug, description || null, icon || null, image || null, parentId || null, sortOrder]);

  const category = await database.get('SELECT * FROM categories WHERE id = ?', [result.id]);

  res.status(201).json({
    message: 'Category created successfully',
    category
  });
});

// Admin: Update category
router.put('/:id', authenticateAdmin, idValidation, async (req, res) => {
  const categoryId = req.params.id;
  const {
    name,
    description,
    icon,
    image,
    parentId,
    sortOrder,
    isActive
  } = req.body;

  // Check if category exists
  const existingCategory = await database.get('SELECT * FROM categories WHERE id = ?', [categoryId]);
  if (!existingCategory) {
    throw new NotFoundError('Category not found');
  }

  // Check if name is being changed and if it conflicts
  if (name && name !== existingCategory.name) {
    const nameConflict = await database.get(
      'SELECT id FROM categories WHERE name = ? AND id != ?',
      [name, categoryId]
    );

    if (nameConflict) {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }
  }

  const updates = [];
  const params = [];

  // Build dynamic update query
  const allowedFields = ['name', 'description', 'icon', 'image', 'parent_id', 'sort_order', 'is_active'];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  }

  // Update slug if name changed
  if (name && name !== existingCategory.name) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    updates.push('slug = ?');
    params.push(slug);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(categoryId);

  await database.execute(
    `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  const updatedCategory = await database.get('SELECT * FROM categories WHERE id = ?', [categoryId]);

  res.json({
    message: 'Category updated successfully',
    category: updatedCategory
  });
});

// Admin: Delete category
router.delete('/:id', authenticateAdmin, idValidation, async (req, res) => {
  const categoryId = req.params.id;

  // Check if category exists
  const category = await database.get('SELECT * FROM categories WHERE id = ?', [categoryId]);
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  // Check if category has products
  const productCount = await database.get(
    'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
    [categoryId]
  );

  if (productCount.count > 0) {
    return res.status(400).json({
      error: `Cannot delete category. It has ${productCount.count} associated products.`
    });
  }

  // Check if category has subcategories
  const subcategoryCount = await database.get(
    'SELECT COUNT(*) as count FROM categories WHERE parent_id = ?',
    [categoryId]
  );

  if (subcategoryCount.count > 0) {
    return res.status(400).json({
      error: `Cannot delete category. It has ${subcategoryCount.count} subcategories.`
    });
  }

  await database.execute('DELETE FROM categories WHERE id = ?', [categoryId]);

  res.json({
    message: 'Category deleted successfully'
  });
});

// Admin: Get category statistics
router.get('/admin/statistics', authenticateAdmin, async (req, res) => {
  const stats = await database.query(`
    SELECT
      c.id,
      c.name,
      COUNT(p.id) as product_count,
      COALESCE(SUM(p.sales_count), 0) as total_sales,
      COALESCE(SUM(oi.quantity), 0) as units_sold,
      COALESCE(SUM(oi.total), 0) as revenue
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active'
    LEFT JOIN order_items oi ON p.id = oi.product_id
    WHERE c.is_active = TRUE
    GROUP BY c.id, c.name
    ORDER BY revenue DESC
  `);

  res.json({
    categories: stats.map(cat => ({
      ...cat,
      revenue: Math.round(cat.revenue * 100) / 100
    }))
  });
});

module.exports = router; 