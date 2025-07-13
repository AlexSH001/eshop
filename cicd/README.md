# Deployment Configuration

This folder contains all deployment-related configurations for the E-Shop application.

## Folder Structure

```
deployment/
├── README.md                    # This file
├── docker/                      # Docker configurations
│   ├── backend/
│   │   └── Dockerfile
│   ├── frontend/
│   │   └── Dockerfile
│   └── nginx/
│       └── nginx.conf
├── docker-compose/              # Docker Compose configurations
│   ├── docker-compose.yml       # Main production compose
│   ├── docker-compose.dev.yml   # Development compose
│   └── docker-compose.test.yml  # Testing compose
├── kubernetes/                  # Kubernetes configurations
│   ├── namespace.yaml
│   ├── postgres.yaml
│   ├── redis.yaml
│   ├── backend.yaml
│   ├── frontend.yaml
│   ├── ingress.yaml
│   └── hpa.yaml
├── scripts/                     # Deployment scripts
│   ├── deploy.sh
│   ├── backup.sh
│   └── rollback.sh
├── ci-cd/                       # CI/CD configurations
│   └── github-actions/
│       └── deploy.yml
└── environments/                # Environment configurations
    ├── .env.production
    ├── .env.staging
    └── .env.example
```

## Quick Start

1. **Development Environment:**
   ```bash
   cd deployment
   docker-compose -f docker-compose/docker-compose.dev.yml up -d
   ```

2. **Production Deployment:**
   ```bash
   cd deployment
   ./scripts/deploy.sh
   ```

3. **Kubernetes Deployment:**
   ```bash
   cd deployment/kubernetes
   kubectl apply -f .
   ```

## Environment Setup

Copy the appropriate environment file and configure it:
```bash
cp environments/.env.example environments/.env.production
# Edit the environment variables
```

## Services

- **Backend**: Node.js API server
- **Frontend**: Next.js application
- **Database**: PostgreSQL
- **Cache**: Redis (with performance optimization)
- **Proxy**: Nginx with SSL termination
- **Monitoring**: Prometheus + Grafana (optional)

## Redis Setup

The application uses Redis for caching and performance optimization. Quick setup:

```bash
# Setup Redis
cd deployment
./setup-redis.sh

# Monitor Redis
./scripts/monitor-redis.sh health

# Quick reference
cat redis-quick-reference.md
```

For detailed Redis deployment information, see:
- [Redis Deployment Guide](./redis-deployment-guide.md)
- [Redis Quick Reference](./redis-quick-reference.md)

## Security Notes

- All sensitive data should be stored in environment variables
- SSL certificates should be properly configured
- Database passwords should be strong and unique
- JWT secrets should be at least 64 characters 