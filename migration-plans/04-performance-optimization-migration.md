# Performance Optimization Migration Plan

## Overview
Implement comprehensive performance optimizations including Redis caching, CDN integration, image optimization, and query optimization.

## Current Issues
- No caching mechanism
- Static assets served directly from server
- Large images not optimized
- Database queries not optimized
- No CDN for global distribution
- No lazy loading implementation

## Migration Strategy

### Phase 1: Redis Caching Implementation

#### Step 1: Install Redis Dependencies
```bash
npm install redis ioredis
npm install --save-dev @types/redis
```

#### Step 2: Create Redis Configuration
Create: `backend/src/config/redis.js`
```javascript
const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redis.on('ready', () => {
  console.log('🚀 Redis is ready');
});

module.exports = redis;
```

#### Step 3: Create Caching Service
Create: `backend/src/services/cacheService.js`
```javascript
const redis = require('../config/redis');

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hour
  }

  async get(key) {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async mget(keys) {
    try {
      const values = await redis.mget(keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs, ttl = this.defaultTTL) {
    try {
      const pipeline = redis.pipeline();
      keyValuePairs.forEach(([key, value]) => {
        pipeline.setex(key, ttl, JSON.stringify(value));
      });
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  async invalidatePattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
      return 0;
    }
  }

  // Cache key generators
  generateProductKey(id) {
    return `product:${id}`;
  }

  generateProductsListKey(filters) {
    const filterString = JSON.stringify(filters);
    return `products:list:${Buffer.from(filterString).toString('base64')}`;
  }

  generateCategoryKey(id) {
    return `category:${id}`;
  }

  generateUserKey(id) {
    return `user:${id}`;
  }

  generateCartKey(userId) {
    return `cart:${userId}`;
  }
}

module.exports = new CacheService();
```

#### Step 4: Implement Caching Middleware
Create: `backend/src/middleware/cache.js`
```javascript
const cacheService = require('../services/cacheService');

const cacheMiddleware = (ttl = 3600, keyGenerator = null) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = keyGenerator ? keyGenerator(req) : `route:${req.originalUrl}`;
    
    try {
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }

      // Store original send method
      const originalSend = res.json;
      
      // Override send method to cache response
      res.json = function(data) {
        cacheService.set(cacheKey, data, ttl);
        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

const invalidateCache = (patterns) => {
  return async (req, res, next) => {
    try {
      const originalSend = res.json;
      
      res.json = async function(data) {
        // Invalidate cache patterns after successful operation
        for (const pattern of patterns) {
          await cacheService.invalidatePattern(pattern);
        }
        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache invalidation error:', error);
      next();
    }
  };
};

module.exports = {
  cacheMiddleware,
  invalidateCache
};
```

#### Step 5: Update Product Routes with Caching
File: `backend/src/routes/products.js`

**Before:**
```javascript
router.get('/', async (req, res) => {
  const products = await database.query('SELECT * FROM products');
  res.json(products);
});
```

**After:**
```javascript
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');
const cacheService = require('../services/cacheService');

// Cache products list
router.get('/', 
  cacheMiddleware(1800, (req) => {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      category: req.query.category,
      search: req.query.search,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice
    };
    return cacheService.generateProductsListKey(filters);
  }),
  async (req, res) => {
    // ... existing logic
  }
);

// Cache individual product
router.get('/:id', 
  cacheMiddleware(3600, (req) => cacheService.generateProductKey(req.params.id)),
  async (req, res) => {
    // ... existing logic
  }
);

// Invalidate cache on product updates
router.put('/:id', 
  authenticateAdmin,
  invalidateCache(['product:*', 'products:list:*']),
  async (req, res) => {
    // ... existing logic
  }
);
```

### Phase 2: Image Optimization

#### Step 6: Install Image Processing Dependencies
```bash
npm install sharp multer-sharp
```

#### Step 7: Create Image Optimization Service
Create: `backend/src/services/imageService.js`
```javascript
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class ImageService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads');
    this.optimizedDir = path.join(__dirname, '../../uploads/optimized');
    this.ensureDirectories();
  }

  async ensureDirectories() {
    const dirs = [
      this.uploadDir,
      this.optimizedDir,
      path.join(this.optimizedDir, 'products'),
      path.join(this.optimizedDir, 'avatars'),
      path.join(this.optimizedDir, 'thumbnails')
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async optimizeImage(inputPath, outputPath, options = {}) {
    const {
      width = 800,
      height = 600,
      quality = 80,
      format = 'webp',
      fit = 'inside'
    } = options;

    try {
      const image = sharp(inputPath);
      
      // Resize image
      const resized = image.resize(width, height, {
        fit,
        withoutEnlargement: true
      });

      // Convert to WebP with quality settings
      const optimized = resized.webp({ quality });

      // Save optimized image
      await optimized.toFile(outputPath);

      return {
        originalSize: (await fs.stat(inputPath)).size,
        optimizedSize: (await fs.stat(outputPath)).size,
        compressionRatio: ((await fs.stat(inputPath)).size - (await fs.stat(outputPath)).size) / (await fs.stat(inputPath)).size * 100
      };
    } catch (error) {
      console.error('Image optimization error:', error);
      throw error;
    }
  }

  async generateThumbnail(inputPath, outputPath, size = 200) {
    return this.optimizeImage(inputPath, outputPath, {
      width: size,
      height: size,
      quality: 70,
      format: 'webp',
      fit: 'cover'
    });
  }

  async optimizeProductImages(originalPath, productId) {
    const filename = path.basename(originalPath, path.extname(originalPath));
    
    // Generate different sizes
    const sizes = [
      { name: 'thumbnail', width: 200, height: 200 },
      { name: 'small', width: 400, height: 400 },
      { name: 'medium', width: 800, height: 800 },
      { name: 'large', width: 1200, height: 1200 }
    ];

    const optimizedImages = {};

    for (const size of sizes) {
      const outputPath = path.join(
        this.optimizedDir,
        'products',
        `${filename}_${size.name}.webp`
      );

      const result = await this.optimizeImage(originalPath, outputPath, {
        width: size.width,
        height: size.height,
        quality: 80
      });

      optimizedImages[size.name] = {
        path: outputPath,
        url: `/uploads/optimized/products/${path.basename(outputPath)}`,
        ...result
      };
    }

    return optimizedImages;
  }

  async deleteOptimizedImages(imagePath) {
    try {
      const filename = path.basename(imagePath, path.extname(imagePath));
      const optimizedDir = path.join(this.optimizedDir, 'products');
      
      const files = await fs.readdir(optimizedDir);
      const matchingFiles = files.filter(file => file.startsWith(filename));
      
      for (const file of matchingFiles) {
        await fs.unlink(path.join(optimizedDir, file));
      }
    } catch (error) {
      console.error('Error deleting optimized images:', error);
    }
  }
}

module.exports = new ImageService();
```

#### Step 8: Update Upload Routes with Image Optimization
File: `backend/src/routes/upload.js`

**Add image optimization:**
```javascript
const imageService = require('../services/imageService');

// Update product image upload
router.post('/product-image', authenticateAdmin, (req, res) => {
  uploadProductImages.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      // Optimize the uploaded image
      const optimizedImages = await imageService.optimizeProductImages(
        req.file.path,
        req.body.productId
      );

      res.json({
        message: 'Image uploaded and optimized successfully',
        file: {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          url: `/uploads/products/${req.file.filename}`,
          optimized: optimizedImages
        }
      });
    } catch (error) {
      console.error('Image optimization error:', error);
      res.status(500).json({ error: 'Image optimization failed' });
    }
  });
});
```

### Phase 3: CDN Integration

#### Step 9: Create CDN Service
Create: `backend/src/services/cdnService.js`
```javascript
const AWS = require('aws-sdk');
const path = require('path');

class CDNService {
  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });
    
    this.bucketName = process.env.AWS_S3_BUCKET;
    this.cdnDomain = process.env.CDN_DOMAIN;
  }

  async uploadToCDN(filePath, key) {
    try {
      const fileStream = require('fs').createReadStream(filePath);
      
      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: fileStream,
        ContentType: this.getContentType(filePath),
        CacheControl: 'public, max-age=31536000', // 1 year
        ACL: 'public-read'
      };

      const result = await this.s3.upload(uploadParams).promise();
      
      return {
        url: this.cdnDomain ? 
          `https://${this.cdnDomain}/${key}` : 
          result.Location,
        key: key
      };
    } catch (error) {
      console.error('CDN upload error:', error);
      throw error;
    }
  }

  async deleteFromCDN(key) {
    try {
      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: key
      }).promise();
    } catch (error) {
      console.error('CDN delete error:', error);
      throw error;
    }
  }

  getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  generateCDNUrl(key) {
    return this.cdnDomain ? 
      `https://${this.cdnDomain}/${key}` : 
      `https://${this.bucketName}.s3.amazonaws.com/${key}`;
  }
}

module.exports = new CDNService();
```

### Phase 4: Query Optimization

#### Step 10: Create Database Query Optimizer
Create: `backend/src/services/queryOptimizer.js`
```javascript
const database = require('../database/postgres');

class QueryOptimizer {
  async getProductsWithOptimizedQueries(filters = {}) {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      minPrice,
      maxPrice,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = filters;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;

    let whereClause = 'WHERE p.status = $1';
    params.push('active');

    if (category) {
      whereClause += ` AND p.category_id = $${++paramIndex}`;
      params.push(category);
    }

    if (search) {
      whereClause += ` AND (p.name ILIKE $${++paramIndex} OR p.description ILIKE $${++paramIndex})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (minPrice) {
      whereClause += ` AND p.price >= $${++paramIndex}`;
      params.push(minPrice);
    }

    if (maxPrice) {
      whereClause += ` AND p.price <= $${++paramIndex}`;
      params.push(maxPrice);
    }

    const orderClause = `ORDER BY p.${sortBy} ${sortOrder}`;
    const limitClause = `LIMIT $${++paramIndex} OFFSET $${++paramIndex}`;
    params.push(limit, offset);

    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        COUNT(*) OVER() as total_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ${orderClause}
      ${limitClause}
    `;

    const results = await database.query(query, params);
    
    const totalCount = results.length > 0 ? results[0].total_count : 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      products: results.map(row => {
        const { total_count, category_name, category_slug, ...product } = row;
        return {
          ...product,
          category: {
            name: category_name,
            slug: category_slug
          }
        };
      }),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount: parseInt(totalCount),
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async getProductWithDetails(id) {
    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        c.description as category_description,
        AVG(pr.rating) as average_rating,
        COUNT(pr.id) as review_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_reviews pr ON p.id = pr.product_id AND pr.is_approved = true
      WHERE p.id = $1 AND p.status = 'active'
      GROUP BY p.id, c.id
    `;

    const result = await database.get(query, [id]);
    return result;
  }
}

module.exports = new QueryOptimizer();
```

## Testing Plan
1. Test Redis caching functionality
2. Test image optimization and compression
3. Test CDN upload and delivery
4. Test query performance improvements
5. Load testing with concurrent users
6. Monitor memory and CPU usage

## Rollback Plan
1. Keep original image files
2. Maintain fallback to direct file serving
3. Monitor cache hit rates
4. Have quick cache disable toggle

## Timeline
- **Week 1**: Implement Redis caching
- **Week 2**: Add image optimization
- **Week 3**: Integrate CDN
- **Week 4**: Optimize database queries

## Success Criteria
- [ ] Redis caching reducing database load by 70%
- [ ] Image sizes reduced by 60% on average
- [ ] Page load times improved by 50%
- [ ] CDN serving 90% of static assets
- [ ] Database query response times under 100ms
- [ ] Cache hit rate above 80%
- [ ] No memory leaks or performance degradation 