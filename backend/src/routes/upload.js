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

[uploadDir, productImagesDir, avatarsDir, miscDir].forEach(dir => {
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

// Upload multiple product images
router.post('/product-images', authenticateAdmin, (req, res) => {
  uploadProductImages.array('images', 10)(req, res, (err) => {
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

    const uploadedFiles = req.files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      url: `/uploads/products/${file.filename}`,
      path: file.path
    }));

    res.json({
      message: `${req.files.length} images uploaded successfully`,
      files: uploadedFiles
    });
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
      const { postgresDatabase } = require('../database/init-postgres');
      const products = await postgresDatabase.query('SELECT featured_image, images FROM products');
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
      const { postgresDatabase } = require('../database/init-postgres');
      const referencedFiles = await postgresDatabase.query(
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
