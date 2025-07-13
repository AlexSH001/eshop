# Redis Deployment Guide

## Overview
This guide covers Redis deployment for the e-commerce application, including setup, configuration, and integration with the Node.js backend.

## Table of Contents
1. [Redis Overview](#redis-overview)
2. [Deployment Options](#deployment-options)
3. [Local Development Setup](#local-development-setup)
4. [Production Deployment](#production-deployment)
5. [Application Integration](#application-integration)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

## Redis Overview

### What is Redis?
Redis (Remote Dictionary Server) is an in-memory data structure store used as a database, cache, and message broker. In our e-commerce application, Redis is used for:

- **API Response Caching**: Cache frequently accessed data (products, categories, user sessions)
- **Session Storage**: Store user sessions and authentication tokens
- **Rate Limiting**: Implement request rate limiting
- **Real-time Features**: Support real-time notifications and updates

### Benefits in Our Application
- **Performance**: 10-100x faster response times for cached data
- **Scalability**: Reduce database load and support higher traffic
- **User Experience**: Faster page loads and smoother interactions
- **Cost Efficiency**: Reduce server resources and database costs

## Deployment Options

### 1. Local Development
- **Docker**: Quick setup with docker-compose
- **Native Installation**: Direct installation on your machine
- **Cloud Services**: Redis Cloud, AWS ElastiCache (free tiers available)

### 2. Production Deployment
- **Self-hosted**: On your own servers/VMs
- **Cloud Managed**: AWS ElastiCache, Google Cloud Memorystore, Azure Cache
- **Container Orchestration**: Kubernetes with Redis StatefulSets
- **PaaS**: Heroku Redis, Railway Redis

## Local Development Setup

### Option 1: Docker (Recommended)

#### Using Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    container_name: eshop-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --requirepass your_redis_password
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  redis_data:
```

#### Start Redis
```bash
# Start Redis container
docker-compose up -d redis

# Check status
docker-compose ps

# View logs
docker-compose logs redis

# Connect to Redis CLI
docker exec -it eshop-redis redis-cli
```

#### Using Docker Run
```bash
# Run Redis container
docker run -d \
  --name eshop-redis \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:7-alpine \
  redis-server --appendonly yes --requirepass your_redis_password

# Connect to Redis CLI
docker exec -it eshop-redis redis-cli -a your_redis_password
```

### Option 2: Native Installation

#### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install Redis
sudo apt install redis-server

# Start Redis service
sudo systemctl start redis-server

# Enable auto-start
sudo systemctl enable redis-server

# Check status
sudo systemctl status redis-server

# Test connection
redis-cli ping
```

#### macOS
```bash
# Install with Homebrew
brew install redis

# Start Redis service
brew services start redis

# Check status
brew services list | grep redis

# Test connection
redis-cli ping
```

#### Windows
```bash
# Using WSL2 (recommended)
# Follow Ubuntu instructions above

# Or using Windows Subsystem for Linux
wsl --install Ubuntu
# Then follow Ubuntu instructions
```

### Option 3: Cloud Services (Free Tiers)

#### Redis Cloud
1. Sign up at [Redis Cloud](https://redis.com/try-free/)
2. Create a free database
3. Get connection details
4. Update environment variables

#### AWS ElastiCache (Free Tier)
1. Create ElastiCache cluster
2. Configure security groups
3. Get endpoint details
4. Update environment variables

## Production Deployment

### Option 1: Self-Hosted Redis

#### Server Requirements
- **CPU**: 2+ cores
- **RAM**: 4GB+ (Redis uses memory for data storage)
- **Storage**: 20GB+ SSD
- **Network**: Low latency connection to application servers

#### Installation Steps
```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Redis
sudo apt install redis-server

# 3. Configure Redis
sudo nano /etc/redis/redis.conf
```

#### Redis Configuration (`/etc/redis/redis.conf`)
```conf
# Network
bind 127.0.0.1 ::1
port 6379
timeout 300

# Security
requirepass your_strong_password_here
rename-command FLUSHDB ""
rename-command FLUSHALL ""

# Memory Management
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000

# Persistence
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Performance
tcp-keepalive 300
tcp-backlog 511
```

#### Start and Enable Redis
```bash
# Start Redis
sudo systemctl start redis-server

# Enable auto-start
sudo systemctl enable redis-server

# Check status
sudo systemctl status redis-server

# Test connection
redis-cli -a your_strong_password_here ping
```

#### Firewall Configuration
```bash
# Allow Redis port (if needed for external access)
sudo ufw allow 6379

# Or restrict to specific IPs
sudo ufw allow from your_app_server_ip to any port 6379
```

### Option 2: Cloud Managed Redis

#### AWS ElastiCache
```bash
# Using AWS CLI
aws elasticache create-cache-cluster \
  --cache-cluster-id eshop-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --port 6379 \
  --cache-parameter-group-family redis7 \
  --auth-token your_auth_token
```

#### Google Cloud Memorystore
```bash
# Using gcloud CLI
gcloud redis instances create eshop-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0
```

### Option 3: Kubernetes Deployment

#### Redis StatefulSet
```yaml
# redis-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        command:
        - redis-server
        - --requirepass
        - $(REDIS_PASSWORD)
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: password
        volumeMounts:
        - name: redis-data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

#### Redis Service
```yaml
# redis-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  type: ClusterIP
```

## Application Integration

### Environment Variables
```bash
# .env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
REDIS_TLS=false

# Redis Pool Configuration
REDIS_POOL_MAX=20
REDIS_POOL_IDLE_TIMEOUT=30000
REDIS_POOL_CONNECTION_TIMEOUT=2000
```

### Application Configuration
The application uses Redis through the following components:

#### 1. Redis Connection (`src/config/redis.js`)
```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  // Production settings
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  // SSL for production
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
});
```

#### 2. Cache Service (`src/services/cacheService.js`)
- **Product Caching**: Cache product details and lists
- **Category Caching**: Cache category hierarchies
- **User Session Caching**: Store user sessions and preferences
- **Search Result Caching**: Cache search queries and results

#### 3. Cache Middleware (`src/middleware/cache.js`)
- **Automatic Caching**: Cache GET requests automatically
- **Cache Invalidation**: Clear cache when data changes
- **Cache Warming**: Pre-load frequently accessed data

### Usage Examples

#### Caching Product Data
```javascript
// Cache a product
await cacheService.set(
  cacheService.generateProductKey(productId),
  productData,
  3600 // 1 hour TTL
);

// Retrieve cached product
const product = await cacheService.get(
  cacheService.generateProductKey(productId)
);
```

#### Caching Product Lists
```javascript
// Cache product list with filters
const filters = { category: 'electronics', page: 1 };
const cacheKey = cacheService.generateProductsListKey(filters);
await cacheService.set(cacheKey, products, 1800); // 30 minutes
```

#### Cache Invalidation
```javascript
// Invalidate all product-related cache when product is updated
await cacheService.invalidatePattern('product:*');
await cacheService.invalidatePattern('products:list:*');
```

## Monitoring & Maintenance

### Health Checks
```bash
# Check Redis status
redis-cli -a your_password ping

# Check memory usage
redis-cli -a your_password info memory

# Check connected clients
redis-cli -a your_password client list

# Check slow queries
redis-cli -a your_password slowlog get 10
```

### Monitoring Tools
- **Redis Commander**: Web-based Redis management
- **RedisInsight**: Official Redis GUI
- **Prometheus + Grafana**: Metrics and alerting
- **Datadog/New Relic**: APM with Redis monitoring

### Backup Strategy
```bash
# Create backup
redis-cli -a your_password BGSAVE

# Check backup status
redis-cli -a your_password LASTSAVE

# Manual backup
cp /var/lib/redis/dump.rdb /backup/redis-$(date +%Y%m%d).rdb
```

### Performance Optimization
```conf
# Redis configuration optimizations
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
```

## Troubleshooting

### Common Issues

#### 1. Connection Refused
```bash
# Check if Redis is running
sudo systemctl status redis-server

# Check port availability
netstat -tlnp | grep 6379

# Check firewall
sudo ufw status
```

#### 2. Authentication Failed
```bash
# Test password
redis-cli -a your_password ping

# Check Redis configuration
sudo grep requirepass /etc/redis/redis.conf
```

#### 3. Memory Issues
```bash
# Check memory usage
redis-cli -a your_password info memory

# Check memory policy
redis-cli -a your_password config get maxmemory-policy

# Clear cache (emergency)
redis-cli -a your_password FLUSHALL
```

#### 4. Performance Issues
```bash
# Check slow queries
redis-cli -a your_password slowlog get 10

# Check command statistics
redis-cli -a your_password info stats

# Monitor real-time commands
redis-cli -a your_password monitor
```

### Debug Commands
```bash
# Get Redis info
redis-cli -a your_password info

# Get configuration
redis-cli -a your_password config get "*"

# Check keys
redis-cli -a your_password keys "*"

# Check key types
redis-cli -a your_password type key_name

# Check key TTL
redis-cli -a your_password ttl key_name
```

## Security Best Practices

### 1. Authentication
- Always use strong passwords
- Use Redis ACLs for fine-grained access control
- Rotate passwords regularly

### 2. Network Security
- Bind Redis to localhost only (if possible)
- Use VPN or private networks for external access
- Implement firewall rules

### 3. Data Protection
- Enable SSL/TLS for production
- Use Redis encryption at rest
- Implement proper backup encryption

### 4. Access Control
- Limit Redis commands (disable dangerous ones)
- Use Redis ACLs for user management
- Monitor access logs

## Scaling Redis

### 1. Redis Cluster
For high availability and horizontal scaling:
```bash
# Create Redis cluster
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1
```

### 2. Redis Sentinel
For automatic failover:
```conf
# sentinel.conf
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 10000
```

### 3. Read Replicas
For read scaling:
```bash
# Configure replica
redis-server --port 6380 --slaveof 127.0.0.1 6379
```

## Conclusion

Redis is a critical component for the e-commerce application's performance. This guide covers:

- ✅ Local development setup
- ✅ Production deployment options
- ✅ Application integration
- ✅ Monitoring and maintenance
- ✅ Troubleshooting common issues
- ✅ Security best practices
- ✅ Scaling strategies

For production deployment, consider:
1. **Managed Redis services** for easier maintenance
2. **High availability** with Redis Cluster or Sentinel
3. **Monitoring and alerting** for proactive issue detection
4. **Regular backups** and disaster recovery planning
5. **Security hardening** following best practices

The application is designed to work seamlessly with Redis and will automatically fall back to database queries if Redis is unavailable, ensuring reliability and performance. 