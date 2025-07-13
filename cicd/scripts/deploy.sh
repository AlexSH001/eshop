#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$DEPLOYMENT_DIR")"
ENVIRONMENT=${1:-production}
COMPOSE_FILE="$DEPLOYMENT_DIR/docker-compose/docker-compose.yml"

# Load environment variables
if [ -f "$DEPLOYMENT_DIR/environments/.env.$ENVIRONMENT" ]; then
    echo -e "${BLUE}📋 Loading environment variables from .env.$ENVIRONMENT${NC}"
    export $(cat "$DEPLOYMENT_DIR/environments/.env.$ENVIRONMENT" | grep -v '^#' | xargs)
else
    echo -e "${RED}❌ Environment file .env.$ENVIRONMENT not found${NC}"
    exit 1
fi

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    log_success "Dependencies check passed"
}

validate_environment() {
    log_info "Validating environment variables..."
    
    required_vars=(
        "DB_PASSWORD"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    log_success "Environment validation passed"
}

backup_database() {
    log_info "Creating database backup..."
    
    BACKUP_DIR="$DEPLOYMENT_DIR/backups"
    mkdir -p "$BACKUP_DIR"
    
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null; then
        log_success "Database backup created: $BACKUP_FILE"
    else
        log_warning "Could not create database backup (database might not be running)"
    fi
}

deploy_services() {
    log_info "Deploying services..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Pull latest images
    log_info "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Stop existing services
    log_info "Stopping existing services..."
    docker-compose -f "$COMPOSE_FILE" down
    
    # Start services
    log_info "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    log_success "Services deployed"
}

wait_for_services() {
    log_info "Waiting for services to be healthy..."
    
    services=("postgres" "redis" "backend" "frontend")
    
    for service in "${services[@]}"; do
        log_info "Waiting for $service to be healthy..."
        
        timeout=120
        while [ $timeout -gt 0 ]; do
            if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "healthy"; then
                log_success "$service is healthy"
                break
            fi
            
            sleep 5
            timeout=$((timeout - 5))
        done
        
        if [ $timeout -le 0 ]; then
            log_error "$service failed to become healthy"
            return 1
        fi
    done
    
    log_success "All services are healthy"
}

run_migrations() {
    log_info "Running database migrations..."
    
    if docker-compose -f "$COMPOSE_FILE" exec -T backend npm run migrate 2>/dev/null; then
        log_success "Database migrations completed"
    else
        log_warning "Could not run migrations (backend might not be ready)"
    fi
}

check_health() {
    log_info "Checking application health..."
    
    # Wait a bit for services to fully start
    sleep 10
    
    # Check backend health
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
        return 1
    fi
    
    # Check frontend health
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        log_success "Frontend health check passed"
    else
        log_error "Frontend health check failed"
        return 1
    fi
    
    log_success "All health checks passed"
}

cleanup() {
    log_info "Cleaning up old images..."
    docker system prune -f
}

show_status() {
    log_info "Deployment status:"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    log_info "Service URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:3001/api"
    echo "  Health Check: http://localhost:3001/api/health"
}

# Main deployment process
main() {
    echo -e "${BLUE}🚀 Starting E-Shop deployment (Environment: $ENVIRONMENT)${NC}"
    echo "=================================================="
    
    check_dependencies
    validate_environment
    backup_database
    deploy_services
    wait_for_services
    run_migrations
    check_health
    cleanup
    show_status
    
    echo ""
    log_success "Deployment completed successfully!"
    echo ""
    log_info "Next steps:"
    echo "  1. Configure your domain in nginx configuration"
    echo "  2. Set up SSL certificates"
    echo "  3. Configure monitoring and alerting"
    echo "  4. Set up automated backups"
}

# Error handling
trap 'log_error "Deployment failed. Check logs for details."; exit 1' ERR

# Run main function
main "$@" 