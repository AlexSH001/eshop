# 🐳 E-Shop Backend Docker Deployment

This document provides comprehensive instructions for containerizing and deploying the E-Shop backend using Docker.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Configuration](#configuration)
- [Database Options](#database-options)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Troubleshooting](#troubleshooting)

## 🛠 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- Basic knowledge of Docker and containerization

## 🚀 Quick Start

### 1. Clone and Navigate
```bash
git clone <repository-url>
cd eshop/backend
```

### 2. Development with SQLite
```bash
# Build and start the backend with SQLite
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### 3. Access the Application
- **API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/api/monitoring/health
- **Metrics**: http://localhost:3001/api/monitoring/metrics

## 🧪 Development Setup

### SQLite Development (Default)
```bash
# Start with SQLite database
docker-compose up --build

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### PostgreSQL Development
```bash
# Start with PostgreSQL database
docker-compose --profile postgres up --build

# View logs
docker-compose logs -f backend-postgres
```

### Development Commands
```bash
# Rebuild after code changes
docker-compose up --build

# Execute commands in running container
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed

# Access container shell
docker-compose exec backend sh

# View container logs
docker-compose logs -f backend
```

## 🏭 Production Deployment

### 1. Environment Configuration

Create a `.env` file with production values:

```bash
# Copy example environment file
cp ../cicd/environments/env.production .env

# Edit with your production values
nano .env
```

### 2. Production Deployment
```bash
# Deploy with production configuration
docker-compose -f docker-compose.yml up -d

# With Nginx reverse proxy
docker-compose -f docker-compose.yml --profile nginx up -d
```

### 3. Database Initialization
```bash
# Initialize database schema
docker-compose exec backend npm run migrate

# Seed with initial data
docker-compose exec backend npm run seed
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Application port | `3001` | No |
| `DB_CLIENT` | Database type | `sqlite3` | No |
| `DB_HOST` | Database host | `localhost` | Yes (PostgreSQL) |
| `DB_NAME` | Database name | `eshop` | Yes |
| `DB_USER` | Database user | - | Yes (PostgreSQL) |
| `DB_PASSWORD` | Database password | - | Yes (PostgreSQL) |
| `REDIS_HOST` | Redis host | `redis` | No |
| `JWT_SECRET` | JWT secret key | - | Yes |
| `JWT_REFRESH_SECRET` | JWT refresh secret | - | Yes |

### Volume Mounts

The following directories are mounted as volumes:

- `/app/data` - Database files (SQLite)
- `/app/uploads` - File uploads
- `/app/logs` - Application logs

## 🗄️ Database Options

### SQLite (Development)
- **Pros**: Simple, no external dependencies
- **Cons**: Not suitable for production
- **Use Case**: Local development, testing

```yaml
environment:
  DB_CLIENT: sqlite3
  DB_NAME: ./data/store.db
```

### PostgreSQL (Production)
- **Pros**: Production-ready, ACID compliance
- **Cons**: Requires external service
- **Use Case**: Production deployments

```yaml
environment:
  DB_CLIENT: postgres
  DB_HOST: postgres
  DB_PORT: 5432
  DB_NAME: eshop
  DB_USER: postgres
  DB_PASSWORD: your_password
```

## 📊 Monitoring & Health Checks

### Health Check Endpoints
- **Application Health**: `GET /api/monitoring/health`
- **Database Health**: `GET /api/monitoring/health/database`
- **Redis Health**: `GET /api/monitoring/health/redis`

### Docker Health Checks
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/api/monitoring/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Monitoring Commands
```bash
# Check container health
docker-compose ps

# View health check logs
docker inspect eshop-backend | grep -A 10 Health

# Monitor application logs
docker-compose logs -f backend

# Check resource usage
docker stats eshop-backend
```

## 🔧 Advanced Configuration

### Multi-Stage Build Optimization

The Dockerfile uses multi-stage builds for optimization:

1. **Base Stage**: System dependencies
2. **Dependencies Stage**: Node.js dependencies
3. **Build Stage**: Application build
4. **Production Stage**: Minimal production image

### Security Features

- **Non-root User**: Application runs as `nodejs` user
- **Minimal Image**: Alpine Linux base
- **Security Headers**: Helmet.js integration
- **Rate Limiting**: Built-in request limiting

### Performance Optimizations

- **Layer Caching**: Optimized layer ordering
- **Multi-stage Build**: Reduced final image size
- **Native Dependencies**: Pre-compiled for Alpine
- **Volume Mounts**: Persistent data storage

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Errors
```bash
# Check database container
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Test database connection
docker-compose exec backend npm run migrate
```

#### 2. Permission Issues
```bash
# Fix volume permissions
sudo chown -R 1001:1001 ./data ./uploads ./logs

# Recreate containers
docker-compose down -v
docker-compose up --build
```

#### 3. Port Conflicts
```bash
# Check port usage
netstat -tulpn | grep :3001

# Use different port
docker-compose up -p 3002:3001
```

#### 4. Memory Issues
```bash
# Check memory usage
docker stats

# Increase memory limits
docker-compose up --memory=1g
```

### Debug Commands

```bash
# Access container shell
docker-compose exec backend sh

# View container logs
docker-compose logs -f backend

# Check environment variables
docker-compose exec backend env

# Test database connection
docker-compose exec backend npm run migrate

# Check file permissions
docker-compose exec backend ls -la /app
```

### Log Analysis

```bash
# View all logs
docker-compose logs

# Filter by service
docker-compose logs backend

# Follow logs in real-time
docker-compose logs -f backend

# View specific log levels
docker-compose logs backend | grep ERROR
```

## 📚 Additional Resources

### Docker Commands Reference
```bash
# Build image
docker build -t eshop-backend .

# Run container
docker run -p 3001:3001 eshop-backend

# View running containers
docker ps

# Stop container
docker stop eshop-backend

# Remove container
docker rm eshop-backend

# Remove image
docker rmi eshop-backend
```

### Docker Compose Commands
```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# Rebuild services
docker-compose up --build

# View service status
docker-compose ps

# Execute commands
docker-compose exec backend npm run seed
```

## 🚀 Deployment Strategies

### 1. Single Container Deployment
```bash
# Build and run single container
docker build -t eshop-backend .
docker run -p 3001:3001 eshop-backend
```

### 2. Docker Compose Deployment
```bash
# Development
docker-compose up --build

# Production
docker-compose -f docker-compose.yml up -d
```

### 3. Kubernetes Deployment
```bash
# Use existing Kubernetes manifests
kubectl apply -f ../cicd/kubernetes/
```

## 🔒 Security Considerations

### Production Security Checklist

- [ ] Use strong passwords for all services
- [ ] Enable SSL/TLS encryption
- [ ] Configure firewall rules
- [ ] Use secrets management
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Network segmentation
- [ ] Backup encryption

### Environment Security

```bash
# Secure environment file
chmod 600 .env

# Use Docker secrets
echo "your_secret" | docker secret create jwt_secret -

# Enable SSL
docker-compose -f docker-compose.yml --profile nginx up -d
```

---

**Happy Containerizing! 🐳**
