const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');

// Helper to handle validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  next();
};

// Auth validation schemas
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  handleValidationErrors
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const adminLoginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Password reset validation schemas
const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  handleValidationErrors
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
  handleValidationErrors
];

const verifyResetTokenValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  handleValidationErrors
];

// Product validation schemas
const createProductValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('shortDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Short description cannot exceed 500 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('originalPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Original price must be a positive number'),
  body('categoryId')
    .isInt({ min: 1 })
    .withMessage('Valid category ID is required'),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'draft'])
    .withMessage('Status must be active, inactive, or draft'),
  handleValidationErrors
];

const updateProductValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid product ID is required'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('originalPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Original price must be a positive number'),
  body('categoryId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid category ID is required'),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'draft'])
    .withMessage('Status must be active, inactive, or draft'),
  handleValidationErrors
];

// Cart validation schemas
const addToCartValidation = [
  body('productId')
    .isInt({ min: 1 })
    .withMessage('Valid product ID is required'),
  body('quantity')
    .isInt({ min: 1, max: 99 })
    .withMessage('Quantity must be between 1 and 99'),
  handleValidationErrors
];

const updateCartValidation = [
  param('itemId').isInt({ min: 1 }).withMessage('Valid cart item ID is required'),
  body('quantity')
    .isInt({ min: 1, max: 99 })
    .withMessage('Quantity must be between 1 and 99'),
  handleValidationErrors
];

// Order validation schemas
const createOrderValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional()
    .custom((value) => {
      if (!value || value === null) return true; // Allow null/empty
      // More lenient phone validation - just check it's not empty and has reasonable length
      const cleaned = value.replace(/[\s\-\(\)]/g, '');
      return cleaned.length >= 7 && cleaned.length <= 15 && /^[\+]?[0-9]+$/.test(cleaned);
    })
    .withMessage('Please provide a valid phone number'),

  // Billing address validation
  body('billingAddress.firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Billing first name must be between 2 and 50 characters'),
  body('billingAddress.lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Billing last name must be between 2 and 50 characters'),
  body('billingAddress.addressLine1')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Billing address line 1 must be between 3 and 100 characters'),
  body('billingAddress.city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Billing city must be between 2 and 50 characters'),
  body('billingAddress.state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Billing state must be between 2 and 50 characters'),
  body('billingAddress.postalCode')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Billing postal code must be between 3 and 20 characters'),
  body('billingAddress.country')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Billing country must be between 2 and 50 characters'),

  // Shipping address validation
  body('shippingAddress.firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Shipping first name must be between 2 and 50 characters'),
  body('shippingAddress.lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Shipping last name must be between 2 and 50 characters'),
  body('shippingAddress.addressLine1')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Shipping address line 1 must be between 3 and 100 characters'),
  body('shippingAddress.city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Shipping city must be between 2 and 50 characters'),
  body('shippingAddress.state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Shipping state must be between 2 and 50 characters'),
  body('shippingAddress.postalCode')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Shipping postal code must be between 3 and 20 characters'),
  body('shippingAddress.country')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Shipping country must be between 2 and 50 characters'),

  handleValidationErrors
];

const updateOrderStatusValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid order ID is required'),
  body('status')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .withMessage('Invalid order status'),
  body('trackingNumber')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Tracking number must be between 3 and 50 characters'),
  handleValidationErrors
];

// Search validation schemas
const searchValidation = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('category')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Category must be a valid ID'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// General validation schemas
const idValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid ID is required'),
  handleValidationErrors
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

module.exports = {
  registerValidation,
  loginValidation,
  adminLoginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  verifyResetTokenValidation,
  createProductValidation,
  updateProductValidation,
  addToCartValidation,
  updateCartValidation,
  createOrderValidation,
  updateOrderStatusValidation,
  searchValidation,
  idValidation,
  paginationValidation,
  handleValidationErrors
};
