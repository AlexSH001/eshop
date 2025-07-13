const redis = require('../config/redis');

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hour
    this.prefix = 'eshop:';
  }

  async get(key) {
    try {
      const fullKey = this.prefix + key;
      const value = await redis.get(fullKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      const fullKey = this.prefix + key;
      await redis.setex(fullKey, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      const fullKey = this.prefix + key;
      await redis.del(fullKey);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async mget(keys) {
    try {
      const fullKeys = keys.map(key => this.prefix + key);
      const values = await redis.mget(fullKeys);
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
        const fullKey = this.prefix + key;
        pipeline.setex(fullKey, ttl, JSON.stringify(value));
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
      const fullPattern = this.prefix + pattern;
      const keys = await redis.keys(fullPattern);
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`🗑️  Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
      return 0;
    }
  }

  async exists(key) {
    try {
      const fullKey = this.prefix + key;
      return await redis.exists(fullKey);
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async expire(key, ttl) {
    try {
      const fullKey = this.prefix + key;
      return await redis.expire(fullKey, ttl);
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  async ttl(key) {
    try {
      const fullKey = this.prefix + key;
      return await redis.ttl(fullKey);
    } catch (error) {
      console.error('Cache ttl error:', error);
      return -1;
    }
  }

  async flush() {
    try {
      const keys = await redis.keys(this.prefix + '*');
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`🗑️  Flushed ${keys.length} cache keys`);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache flush error:', error);
      return 0;
    }
  }

  async getStats() {
    try {
      const info = await redis.info();
      const keys = await redis.keys(this.prefix + '*');
      return {
        totalKeys: keys.length,
        info: info,
        memory: await redis.memory('USAGE'),
        connected: redis.status === 'ready'
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { error: error.message };
    }
  }

  // Cache key generators
  generateProductKey(id) {
    return `product:${id}`;
  }

  generateProductsListKey(filters) {
    const filterString = JSON.stringify(filters || {});
    return `products:list:${Buffer.from(filterString).toString('base64')}`;
  }

  generateCategoryKey(id) {
    return `category:${id}`;
  }

  generateCategoriesListKey() {
    return 'categories:list';
  }

  generateUserKey(id) {
    return `user:${id}`;
  }

  generateCartKey(userId) {
    return `cart:${userId}`;
  }

  generateSearchKey(query, filters) {
    const searchData = { query, filters };
    return `search:${Buffer.from(JSON.stringify(searchData)).toString('base64')}`;
  }

  generateOrderKey(id) {
    return `order:${id}`;
  }

  generateWishlistKey(userId) {
    return `wishlist:${userId}`;
  }

  // Cache invalidation patterns
  getProductInvalidationPatterns() {
    return [
      'product:*',
      'products:list:*',
      'search:*'
    ];
  }

  getCategoryInvalidationPatterns() {
    return [
      'category:*',
      'categories:list',
      'products:list:*'
    ];
  }

  getUserInvalidationPatterns() {
    return [
      'user:*',
      'cart:*',
      'wishlist:*',
      'order:*'
    ];
  }

  getOrderInvalidationPatterns() {
    return [
      'order:*',
      'user:*',
      'cart:*'
    ];
  }
}

module.exports = new CacheService(); 