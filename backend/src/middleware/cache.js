const cacheService = require('../services/cacheService');

const cacheMiddleware = (ttl = 3600, keyGenerator = null) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching for authenticated requests that need fresh data
    if (req.headers.authorization && req.headers['cache-control'] === 'no-cache') {
      return next();
    }

    const cacheKey = keyGenerator ? keyGenerator(req) : `route:${req.originalUrl}`;
    
    try {
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData) {
        // Add cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }

      // Store original send method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(data) {
        // Add cache headers
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);
        
        // Cache the response
        cacheService.set(cacheKey, data, ttl);
        
        return originalJson.call(this, data);
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
      const originalJson = res.json;
      
      res.json = async function(data) {
        // Invalidate cache patterns after successful operation
        for (const pattern of patterns) {
          await cacheService.invalidatePattern(pattern);
        }
        
        // Add invalidation headers
        res.set('X-Cache-Invalidated', patterns.join(', '));
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache invalidation error:', error);
      next();
    }
  };
};

const cacheControl = (maxAge = 3600, staleWhileRevalidate = 60) => {
  return (req, res, next) => {
    res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`);
    next();
  };
};

const noCache = () => {
  return (req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  };
};

// Cache warming middleware
const warmCache = (keyGenerator, dataFetcher, ttl = 3600) => {
  return async (req, res, next) => {
    try {
      const cacheKey = keyGenerator(req);
      const exists = await cacheService.exists(cacheKey);
      
      if (!exists) {
        // Fetch and cache data in background
        dataFetcher(req).then(async (data) => {
          await cacheService.set(cacheKey, data, ttl);
          console.log(`🔥 Cache warmed for key: ${cacheKey}`);
        }).catch(error => {
          console.error('Cache warming error:', error);
        });
      }
      
      next();
    } catch (error) {
      console.error('Cache warming middleware error:', error);
      next();
    }
  };
};

// Cache statistics middleware
const cacheStats = () => {
  return async (req, res, next) => {
    try {
      const stats = await cacheService.getStats();
      res.set('X-Cache-Stats', JSON.stringify(stats));
      next();
    } catch (error) {
      console.error('Cache stats error:', error);
      next();
    }
  };
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  cacheControl,
  noCache,
  warmCache,
  cacheStats
}; 