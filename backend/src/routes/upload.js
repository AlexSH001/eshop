const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads');
const productImagesDir = path.join(uploadDir, 'products');
const avatarsDir = path.join(uploadDir, 'avatars');
const miscDir = path.join(uploadDir, 'misc');
const categoriesDir = path.join(uploadDir, 'categories');

[uploadDir, productImagesDir, avatarsDir, miscDir, categoriesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, JPG, PNG, GIF, WebP)'), false);
  }
};

// Storage configuration for product images
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, productImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Storage configuration for avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `avatar-${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Storage configuration for miscellaneous files
const miscStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, miscDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Storage configuration for category images
const categoryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, categoriesDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `category-${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Multer configurations
const uploadProductImages = multer({
  storage: productStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const uploadAvatars = multer({
  storage: avatarStorage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit for avatars
  }
});

const uploadMisc = multer({
  storage: miscStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for misc files
  }
});

const uploadCategoryImage = multer({
  storage: categoryStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for category images
  }
});

// Upload single product image
router.post('/product-image', authenticateAdmin, (req, res) => {
  uploadProductImages.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 5MB.' });
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Unexpected file field. Use "image" field name.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/products/${req.file.filename}`;

    res.json({
      message: 'Image uploaded successfully',
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        url: fileUrl,
        path: req.file.path
      }
    });
  });
});

// Upload multiple product images with category-based folder structure
router.post('/product-images', authenticateAdmin, (req, res) => {
  // Use memory storage to first get the form data and files
  const tempStorage = multer.memoryStorage();
  const tempUpload = multer({ 
    storage: tempStorage,
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    }
  });
  
  tempUpload.array('images', 10)(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'One or more files too large. Maximum size is 5MB per file.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { categoryId, productName } = req.body;
    
    if (!categoryId) {
      return res.status(400).json({ error: 'Category ID is required. Please select a category before uploading images.' });
    }

    try {
      // Get category name from database
      const { db } = require('../database');
      const category = await db.get('SELECT name FROM categories WHERE id = $1', [categoryId]);
      
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      // Create category folder name (sanitize: remove spaces and special characters, keep only alphanumeric and hyphens)
      const categoryFolderName = category.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
      const categoryDir = path.join(productImagesDir, categoryFolderName);
      
      // Create category directory if it doesn't exist
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
      }

      // Now save the files to the correct location
      const uploadedFiles = [];
      
      for (const file of req.files) {
        // Generate filename: product_name-yyyymmdd-xxxxx.ext
        const productNameSlug = (productName || 'product').toLowerCase().replace(/\s+/g, '-');
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomNum = Math.floor(Math.random() * 90000) + 10000; // 5-digit random number
        const extension = path.extname(file.originalname);
        const filename = `${productNameSlug}-${date}-${randomNum}${extension}`;
        
        const filePath = path.join(categoryDir, filename);
        
        // Write file to disk
        fs.writeFileSync(filePath, file.buffer);
        
        uploadedFiles.push({
          originalName: file.originalname,
          filename: filename,
          size: file.size,
          url: `/uploads/products/${categoryFolderName}/${filename}`,
          path: filePath
        });
      }

      res.json({
        message: `${uploadedFiles.length} images uploaded successfully`,
        files: uploadedFiles
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to process upload' });
    }
  });
});

// Upload avatar
router.post('/avatar', (req, res) => {
  uploadAvatars.single('avatar')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 2MB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/avatars/${req.file.filename}`;

    res.json({
      message: 'Avatar uploaded successfully',
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        url: fileUrl,
        path: req.file.path
      }
    });
  });
});

// Upload miscellaneous file
router.post('/misc', authenticateAdmin, (req, res) => {
  uploadMisc.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/misc/${req.file.filename}`;

    res.json({
      message: 'File uploaded successfully',
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        url: fileUrl,
        path: req.file.path
      }
    });
  });
});

// Upload category image
router.post('/category-image', authenticateAdmin, (req, res) => {
  uploadCategoryImage.single('image')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 5MB.' });
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Unexpected file field. Use "image" field name.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      // Optimize the image using imageService
      const imageService = require('../services/imageService');
      const optimizedResult = await imageService.optimizeCategoryImage(
        req.file.path,
        req.file.filename
      );

      const fileUrl = `/uploads/categories/${optimizedResult.filename || req.file.filename}`;

      res.json({
        message: 'Category image uploaded and optimized successfully',
        file: {
          originalName: req.file.originalname,
          filename: optimizedResult.filename || req.file.filename,
          size: optimizedResult.optimizedSize || req.file.size,
          url: fileUrl,
          path: optimizedResult.path || req.file.path,
          originalSize: optimizedResult.originalSize,
          compressionRatio: optimizedResult.compressionRatio
        }
      });
    } catch (optimizeError) {
      console.error('Error optimizing category image:', optimizeError);
      // Return the unoptimized image if optimization fails
      const fileUrl = `/uploads/categories/${req.file.filename}`;
      res.json({
        message: 'Category image uploaded successfully (optimization failed)',
        file: {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          url: fileUrl,
          path: req.file.path
        }
      });
    }
  });
});

// Delete uploaded file
router.delete('/file', authenticateAdmin, async (req, res) => {
  const { filename, category = 'products' } = req.body;

  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  let filePath;
  switch (category) {
    case 'products':
      filePath = path.join(productImagesDir, filename);
      break;
    case 'avatars':
      filePath = path.join(avatarsDir, filename);
      break;
    case 'misc':
      filePath = path.join(miscDir, filename);
      break;
    case 'categories':
      filePath = path.join(categoriesDir, filename);
      break;
    default:
      return res.status(400).json({ error: 'Invalid category' });
  }

  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete file
    fs.unlinkSync(filePath);

    res.json({
      message: 'File deleted successfully',
      filename
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Delete product image by URL
router.delete('/product-image', authenticateAdmin, async (req, res) => {
  const { imageUrl } = req.body;

  console.log('Delete image request body:', req.body);

  if (!imageUrl) {
    return res.status(400).json({ error: 'Image URL is required' });
  }

  try {
    // Extract filename from URL
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const categoryFolder = urlParts[urlParts.length - 2];
    
    console.log('Image deletion request:', { imageUrl, filename, categoryFolder });
    
    let filePath;
    if (categoryFolder && categoryFolder !== 'products') {
      // Image is in a category subfolder
      filePath = path.join(productImagesDir, categoryFolder, filename);
    } else {
      // Image is in the main products folder
      filePath = path.join(productImagesDir, filename);
    }

    console.log('Looking for file at path:', filePath);
    console.log('File exists:', fs.existsSync(filePath));

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('File not found at:', filePath);
      
      // Try alternative path resolution
      const alternativePath = path.join(__dirname, '../../uploads', imageUrl.replace('/uploads/', ''));
      console.log('Trying alternative path:', alternativePath);
      
      if (fs.existsSync(alternativePath)) {
        filePath = alternativePath;
        console.log('Found file at alternative path:', filePath);
      } else {
        return res.status(404).json({ error: 'File not found' });
      }
    }

    // Move to deleted folder instead of permanently deleting
    const deletedDir = path.join(__dirname, '../../uploads/products/_DELETED');
    if (!fs.existsSync(deletedDir)) {
      fs.mkdirSync(deletedDir, { recursive: true });
    }

    const deletedFilePath = path.join(deletedDir, filename);
    fs.renameSync(filePath, deletedFilePath);

    res.json({
      message: 'Image moved to deleted folder successfully',
      filename
    });
  } catch (error) {
    console.error('Error moving image to deleted folder:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Delete category image by URL
router.delete('/category-image', authenticateAdmin, async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Image URL is required' });
  }

  try {
    // Extract filename from URL
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    
    let filePath = path.join(categoriesDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // Try alternative path resolution
      const alternativePath = path.join(__dirname, '../../uploads', imageUrl.replace('/uploads/', ''));
      if (fs.existsSync(alternativePath)) {
        filePath = alternativePath;
      } else {
        return res.status(404).json({ error: 'File not found' });
      }
    }

    // Move to deleted folder instead of permanently deleting
    const deletedDir = path.join(__dirname, '../../uploads/categories/_DELETED');
    if (!fs.existsSync(deletedDir)) {
      fs.mkdirSync(deletedDir, { recursive: true });
    }

    const deletedFilePath = path.join(deletedDir, filename);
    fs.renameSync(filePath, deletedFilePath);

    res.json({
      message: 'Category image moved to deleted folder successfully',
      filename
    });
  } catch (error) {
    console.error('Error moving category image to deleted folder:', error);
    res.status(500).json({ error: 'Failed to delete category image' });
  }
});

// Get file info
router.get('/file/:category/:filename', (req, res) => {
  const { category, filename } = req.params;

  let filePath;
  switch (category) {
    case 'products':
      filePath = path.join(productImagesDir, filename);
      break;
    case 'avatars':
      filePath = path.join(avatarsDir, filename);
      break;
    case 'misc':
      filePath = path.join(miscDir, filename);
      break;
    case 'categories':
      filePath = path.join(categoriesDir, filename);
      break;
    default:
      return res.status(400).json({ error: 'Invalid category' });
  }

  try {
    const stats = fs.statSync(filePath);

    res.json({
      filename,
      category,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      url: `/uploads/${category}/${filename}`
    });
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
});

// List files in category
router.get('/files/:category', authenticateAdmin, (req, res) => {
  const { category } = req.params;
  const { page = 1, limit = 20 } = req.query;

  let dirPath;
  switch (category) {
    case 'products':
      dirPath = productImagesDir;
      break;
    case 'avatars':
      dirPath = avatarsDir;
      break;
    case 'misc':
      dirPath = miscDir;
      break;
    case 'categories':
      dirPath = categoriesDir;
      break;
    default:
      return res.status(400).json({ error: 'Invalid category' });
  }

  try {
    const files = fs.readdirSync(dirPath);
    const offset = (page - 1) * limit;
    const paginatedFiles = files.slice(offset, offset + parseInt(limit));

    const fileDetails = paginatedFiles.map(filename => {
      const filePath = path.join(dirPath, filename);
      const stats = fs.statSync(filePath);

      return {
        filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        url: `/uploads/${category}/${filename}`
      };
    });

    res.json({
      files: fileDetails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: files.length,
        pages: Math.ceil(files.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Clean up orphaned files (files not referenced in database)
router.post('/cleanup', authenticateAdmin, async (req, res) => {
  const { category = 'products', dryRun = true } = req.body;

  let dirPath, tableName, columnName;

  switch (category) {
    case 'products':
      dirPath = productImagesDir;
      // For products, we need to check both featured_image and images JSON array
      break;
    case 'avatars':
      dirPath = avatarsDir;
      tableName = 'users';
      columnName = 'avatar';
      break;
    default:
      return res.status(400).json({ error: 'Invalid category for cleanup' });
  }

  try {
    const files = fs.readdirSync(dirPath);
    const orphanedFiles = [];

    if (category === 'products') {
      // Get all referenced image files from products table
      const { db } = require('../database');
      const products = await db.query('SELECT featured_image, images FROM products');
      const referencedFiles = new Set();

      products.forEach(product => {
        if (product.featured_image) {
          const filename = path.basename(product.featured_image);
          referencedFiles.add(filename);
        }

        if (product.images) {
          try {
            const images = JSON.parse(product.images);
            images.forEach(imageUrl => {
              const filename = path.basename(imageUrl);
              referencedFiles.add(filename);
            });
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      });

      // Find orphaned files
      files.forEach(filename => {
        if (!referencedFiles.has(filename)) {
          orphanedFiles.push(filename);
        }
      });
    } else {
      // For other categories, check single column reference
      const { db } = require('../database');
      const referencedFiles = await db.query(
        `SELECT DISTINCT ${columnName} FROM ${tableName} WHERE ${columnName} IS NOT NULL`
      );

      const referencedSet = new Set(
        referencedFiles.map(row => path.basename(row[columnName]))
      );

      files.forEach(filename => {
        if (!referencedSet.has(filename)) {
          orphanedFiles.push(filename);
        }
      });
    }

    if (!dryRun) {
      // Actually delete the orphaned files
      orphanedFiles.forEach(filename => {
        const filePath = path.join(dirPath, filename);
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error(`Failed to delete ${filename}:`, error);
        }
      });
    }

    res.json({
      message: dryRun ? 'Cleanup analysis complete' : 'Cleanup completed',
      orphanedFiles,
      totalFiles: files.length,
      deletedCount: dryRun ? 0 : orphanedFiles.length,
      dryRun
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to perform cleanup' });
  }
});

module.exports = router;
