# E-Shop Helm Chart

A comprehensive Helm chart for deploying the E-Shop application (backend, frontend, PostgreSQL, Redis) on Kubernetes with production-ready configurations.

## 🚀 Quick Start

### Prerequisites

- Kubernetes cluster (1.19+)
- Helm 3.0+
- kubectl configured
- Storage class for persistent volumes (optional)

### Basic Installation

```bash
# Add the chart repository (if using a repository)
helm repo add eshop https://your-repo.com/charts
helm repo update

# Install the chart
helm install eshop ./deployment/helm/eshop

# Or with custom values
helm install eshop ./deployment/helm/eshop -f values-production.yaml
```

### Uninstallation

```bash
helm uninstall eshop
```

## 📋 Components

This chart deploys the following components:

- **Backend**: Node.js API server with monitoring and health checks
- **Frontend**: Next.js application with SSR support
- **PostgreSQL**: Database with persistence and initialization scripts
- **Redis**: Cache layer with optional persistence
- **Ingress**: External access configuration (optional)
- **Secrets**: Secure storage for sensitive data

## ⚙️ Configuration

### Values File Structure

```yaml
# Global settings
global:
  imagePullSecrets: []
  nameOverride: ""
  fullnameOverride: ""

# Backend configuration
backend:
  image:
    repository: yourrepo/eshop-backend
    tag: latest
  replicaCount: 1
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
  persistence:
    enabled: true
    uploadsSize: "5Gi"
    logsSize: "1Gi"

# Frontend configuration
frontend:
  image:
    repository: yourrepo/eshop-frontend
    tag: latest
  replicaCount: 1
  persistence:
    enabled: true
    cacheSize: "2Gi"

# PostgreSQL configuration
postgresql:
  enabled: true
  auth:
    username: eshop
    password: eshop_password
    database: eshop
  persistence:
    enabled: true
    size: 10Gi

# Redis configuration
redis:
  enabled: true
  password: eshop_redis_password
  persistence:
    enabled: false

# Ingress configuration
ingress:
  enabled: false
  hosts:
    - host: eshop.local
      paths:
        - path: /
          service: frontend
        - path: /api
          service: backend
```

### Environment-Specific Values

#### Development Values (`values-dev.yaml`)

```yaml
backend:
  replicaCount: 1
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "256Mi"
      cpu: "200m"

frontend:
  replicaCount: 1
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "256Mi"
      cpu: "200m"

postgresql:
  persistence:
    enabled: false

redis:
  persistence:
    enabled: false

ingress:
  enabled: false
```

#### Production Values (`values-production.yaml`)

```yaml
backend:
  replicaCount: 3
  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "1Gi"
      cpu: "1000m"
  persistence:
    enabled: true
    storageClass: "fast-ssd"

frontend:
  replicaCount: 2
  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "1Gi"
      cpu: "1000m"
  persistence:
    enabled: true
    storageClass: "fast-ssd"

postgresql:
  persistence:
    enabled: true
    storageClass: "fast-ssd"
    size: 50Gi
  resources:
    requests:
      memory: "1Gi"
      cpu: "500m"
    limits:
      memory: "4Gi"
      cpu: "2000m"

redis:
  persistence:
    enabled: true
    storageClass: "fast-ssd"
    size: 10Gi
  resources:
    requests:
      memory: "256Mi"
      cpu: "200m"
    limits:
      memory: "1Gi"
      cpu: "500m"

ingress:
  enabled: true
  className: "nginx"
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: eshop.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
          service: frontend
          port: 3000
        - path: /api
          pathType: Prefix
          service: backend
          port: 3001
  tls:
    - secretName: eshop-tls
      hosts:
        - eshop.yourdomain.com
```

## 🔐 Security Configuration

### Secrets Management

The chart automatically creates Kubernetes secrets for sensitive data:

- `jwt-secret`: JWT signing secret
- `db-password`: PostgreSQL password
- `redis-password`: Redis password
- `sentry-dsn`: Sentry DSN (optional)

### Security Best Practices

1. **Change Default Passwords**: Update all default passwords in values
2. **Use Secrets**: Store sensitive data in Kubernetes secrets
3. **Network Policies**: Implement network policies for pod-to-pod communication
4. **RBAC**: Configure appropriate RBAC rules
5. **Pod Security**: Run containers as non-root users

### Example Security Values

```yaml
backend:
  env:
    JWT_SECRET: "your-super-secure-jwt-secret-here"
    SENTRY_DSN: "https://your-sentry-dsn"

postgresql:
  auth:
    password: "your-secure-db-password"

redis:
  password: "your-secure-redis-password"
```

## 📊 Monitoring and Observability

### Health Checks

All components include health checks:

- **Backend**: `/api/monitoring/health`, `/api/monitoring/ready`, `/api/monitoring/live`
- **Frontend**: `/` (root path)
- **PostgreSQL**: `pg_isready` command
- **Redis**: `redis-cli ping` command

### Metrics

- **Backend**: Prometheus metrics at `/api/monitoring/metrics`
- **Application Info**: `/api/monitoring/info`
- **Status**: `/api/monitoring/status`

### Logging

- Structured logging with Winston
- Log rotation and retention
- Request/response logging
- Error tracking with Sentry

## 🔄 Scaling and High Availability

### Horizontal Pod Autoscaling

```yaml
# Enable HPA for backend
backend:
  hpa:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80
```

### Database Scaling

For production, consider using managed database services:

```yaml
postgresql:
  enabled: false  # Disable local PostgreSQL

backend:
  env:
    DB_HOST: "your-managed-postgres-host"
    DB_PORT: "5432"
    DB_NAME: "eshop"
    DB_USER: "eshop"
    DB_PASSWORD: "your-password"
```

### Redis Scaling

For production, consider using managed Redis:

```yaml
redis:
  enabled: false  # Disable local Redis

backend:
  env:
    REDIS_HOST: "your-managed-redis-host"
    REDIS_PORT: "6379"
    REDIS_PASSWORD: "your-password"
```

## 🚀 Deployment Strategies

### Rolling Update

```bash
# Update with rolling restart
helm upgrade eshop ./deployment/helm/eshop --set backend.image.tag=v1.1.0
```

### Blue-Green Deployment

```bash
# Deploy new version
helm install eshop-v2 ./deployment/helm/eshop --set nameOverride=eshop-v2

# Switch traffic
kubectl patch ingress eshop-ingress -p '{"spec":{"rules":[{"host":"eshop.local","http":{"paths":[{"path":"/","backend":{"service":{"name":"eshop-v2-frontend","port":{"number":3000}}}}]}}]}}'

# Remove old version
helm uninstall eshop
```

### Canary Deployment

```bash
# Deploy canary
helm install eshop-canary ./deployment/helm/eshop \
  --set nameOverride=eshop-canary \
  --set frontend.replicaCount=1 \
  --set backend.replicaCount=1

# Gradually increase traffic
kubectl patch ingress eshop-ingress -p '{"spec":{"rules":[{"host":"eshop.local","http":{"paths":[{"path":"/","backend":{"service":{"name":"eshop-canary-frontend","port":{"number":3000}}}}]}}]}}'
```

## 🔧 Advanced Configuration

### Custom Resource Limits

```yaml
backend:
  resources:
    requests:
      memory: "1Gi"
      cpu: "1000m"
    limits:
      memory: "2Gi"
      cpu: "2000m"
      ephemeral-storage: "1Gi"
```

### Node Affinity

```yaml
backend:
  nodeSelector:
    node-type: application
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: node-type
            operator: In
            values:
            - application
```

### Pod Disruption Budget

```yaml
backend:
  pdb:
    enabled: true
    minAvailable: 1
```

### Network Policies

```yaml
networkPolicy:
  enabled: true
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3001
```

## 🛠️ Troubleshooting

### Common Issues

1. **Pod Startup Issues**
   ```bash
   kubectl describe pod -n eshop eshop-backend-xxx
   kubectl logs -n eshop eshop-backend-xxx
   ```

2. **Database Connection Issues**
   ```bash
   kubectl exec -n eshop eshop-postgresql-0 -- pg_isready -U eshop
   ```

3. **Redis Connection Issues**
   ```bash
   kubectl exec -n eshop eshop-redis-0 -- redis-cli -a password ping
   ```

4. **Health Check Failures**
   ```bash
   kubectl get endpoints -n eshop
   kubectl describe endpoints -n eshop eshop-backend
   ```

### Debug Commands

```bash
# Check all resources
kubectl get all -n eshop

# Check persistent volumes
kubectl get pvc -n eshop

# Check secrets
kubectl get secrets -n eshop

# Check ingress
kubectl get ingress -n eshop

# Port forward for local testing
kubectl port-forward -n eshop svc/eshop-backend 3001:3001
kubectl port-forward -n eshop svc/eshop-frontend 3000:3000
```

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [E-Shop Application Documentation](../README.md)
- [Monitoring and Observability Guide](../migration-plans/05-monitoring-observability-migration.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with different environments
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 