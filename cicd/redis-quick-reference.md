# Redis Quick Reference

## 🚀 Quick Start

### 1. Setup Redis
```bash
# Run the setup script
cd deployment
./setup-redis.sh

# Or manually with Docker
docker run -d --name eshop-redis -p 6379:6379 redis:7-alpine
```

### 2. Environment Variables
```bash
# Add to your .env file
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

### 3. Test Connection
```bash
# Test from application
npm run test:redis

# Test from CLI
docker exec -it eshop-redis redis-cli ping
```

## 📊 Monitoring

### Health Check
```bash
# Quick health check
./deployment/scripts/monitor-redis.sh health

# Full monitoring
./deployment/scripts/monitor-redis.sh report
```

### Key Metrics
- **Memory Usage**: `docker exec eshop-redis redis-cli info memory`
- **Cache Hit Rate**: `docker exec eshop-redis redis-cli info stats`
- **Connected Clients**: `docker exec eshop-redis redis-cli client list`

## 🔧 Application Usage

### Cache Service
```javascript
// Cache a product
await cacheService.set('product:123', productData, 3600);

// Get cached product
const product = await cacheService.get('product:123');

// Invalidate cache
await cacheService.invalidatePattern('product:*');
```

### Cache Middleware
```javascript
// Automatic caching for GET requests
app.get('/api/products', cache(300), productController.getAll);

// Cache invalidation on updates
app.put('/api/products/:id', invalidateCache('product:*'), productController.update);
```

### Image Optimization
```javascript
// Optimize and cache image
const optimizedImage = await imageService.optimize(imageBuffer, {
  format: 'webp',
  quality: 80,
  width: 800
});
```

## 🗝️ Cache Keys

### Product Cache
- `eshop:product:{id}` - Individual product
- `eshop:products:list:{filters}` - Product lists
- `eshop:products:search:{query}` - Search results

### Category Cache
- `eshop:category:{id}` - Individual category
- `eshop:categories:tree` - Category hierarchy
- `eshop:categories:list` - Category list

### User Cache
- `eshop:user:{id}` - User profile
- `eshop:user:{id}:cart` - User cart
- `eshop:user:{id}:orders` - User orders

### Session Cache
- `eshop:session:{token}` - User sessions
- `eshop:auth:{token}` - Authentication tokens

## 🔄 Cache Invalidation

### Automatic Invalidation
- Product updates → Clear product and list caches
- Category updates → Clear category and product caches
- User updates → Clear user and session caches

### Manual Invalidation
```javascript
// Clear all product cache
await cacheService.invalidatePattern('eshop:product:*');

// Clear specific user cache
await cacheService.invalidatePattern('eshop:user:123:*');

// Clear all cache
await cacheService.flush();
```

## 📈 Performance Tips

### 1. TTL Strategy
- **Products**: 1 hour (frequently accessed)
- **Categories**: 2 hours (less frequently changed)
- **Users**: 30 minutes (sensitive data)
- **Search**: 15 minutes (dynamic content)

### 2. Memory Management
```conf
# Redis configuration
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### 3. Connection Pooling
```javascript
// Optimized connection settings
const redis = new Redis({
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  // Production settings
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
});
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Connection Failed
```bash
# Check if Redis is running
docker ps | grep redis

# Check Redis logs
docker logs eshop-redis

# Test connection
docker exec eshop-redis redis-cli ping
```

#### 2. Memory Issues
```bash
# Check memory usage
docker exec eshop-redis redis-cli info memory

# Clear cache (emergency)
docker exec eshop-redis redis-cli FLUSHALL
```

#### 3. Performance Issues
```bash
# Check slow queries
docker exec eshop-redis redis-cli slowlog get 10

# Monitor commands
docker exec eshop-redis redis-cli monitor
```

### Debug Commands
```bash
# Get all keys
docker exec eshop-redis redis-cli keys "*"

# Get key info
docker exec eshop-redis redis-cli type key_name
docker exec eshop-redis redis-cli ttl key_name

# Get Redis info
docker exec eshop-redis redis-cli info
```

## 🔒 Security

### Authentication
```bash
# Set password
docker exec eshop-redis redis-cli config set requirepass "strong_password"

# Test with password
docker exec eshop-redis redis-cli -a "strong_password" ping
```

### Network Security
```conf
# Bind to localhost only
bind 127.0.0.1

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
```

## 📚 Useful Commands

### Data Management
```bash
# Backup data
docker exec eshop-redis redis-cli BGSAVE

# Restore data
docker exec eshop-redis redis-cli restore key_name 0 "data"

# Export data
docker exec eshop-redis redis-cli --rdb dump.rdb
```

### Monitoring
```bash
# Real-time monitoring
docker exec eshop-redis redis-cli monitor

# Memory analysis
docker exec eshop-redis redis-cli memory usage key_name

# Latency monitoring
docker exec eshop-redis redis-cli --latency
```

## 🎯 Best Practices

### 1. Key Naming
- Use consistent prefixes: `eshop:entity:identifier`
- Include version in keys for major changes
- Use descriptive names for debugging

### 2. Data Serialization
```javascript
// Use JSON for complex objects
await cacheService.set(key, JSON.stringify(data));

// Parse on retrieval
const data = JSON.parse(await cacheService.get(key));
```

### 3. Error Handling
```javascript
try {
  const data = await cacheService.get(key);
  return data ? JSON.parse(data) : null;
} catch (error) {
  console.error('Cache error:', error);
  return null; // Fallback to database
}
```

### 4. Cache Warming
```javascript
// Pre-load frequently accessed data
const popularProducts = await productService.getPopular();
await cacheService.set('eshop:products:popular', JSON.stringify(popularProducts));
```

## 📞 Support

### Documentation
- [Redis Deployment Guide](./redis-deployment-guide.md)
- [Performance Optimization Migration](./migration-plans/04-performance-optimization-migration.md)

### Monitoring Tools
- **Redis Commander**: Web-based management
- **RedisInsight**: Official GUI
- **Prometheus + Grafana**: Metrics and alerting

### Useful Links
- [Redis Documentation](https://redis.io/documentation)
- [ioredis Documentation](https://github.com/luin/ioredis)
- [Redis Best Practices](https://redis.io/topics/memory-optimization) 