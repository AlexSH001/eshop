#!/bin/bash

# ========================================
# E-Shop Backend Docker Startup Script
# ========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  dev         Start development environment (SQLite)"
    echo "  dev-pg      Start development environment (PostgreSQL)"
    echo "  prod        Start production environment"
    echo "  build       Build Docker images"
    echo "  stop        Stop all containers"
    echo "  clean       Clean up containers and volumes"
    echo "  logs        View application logs"
    echo "  shell       Access container shell"
    echo "  migrate     Run database migrations"
    echo "  seed        Seed database with sample data"
    echo "  health      Check application health"
    echo "  help        Show this help message"
    echo ""
    echo "Options:"
    echo "  -d, --detach    Run in detached mode"
    echo "  -f, --force     Force rebuild without cache"
    echo "  -v, --verbose   Verbose output"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to start development environment
start_dev() {
    print_header "Starting Development Environment (SQLite)"
    check_docker
    
    if [ "$DETACH" = true ]; then
        docker-compose up -d --build
    else
        docker-compose up --build
    fi
}

# Function to start development with PostgreSQL
start_dev_pg() {
    print_header "Starting Development Environment (PostgreSQL)"
    check_docker
    
    if [ "$DETACH" = true ]; then
        docker-compose --profile postgres up -d --build
    else
        docker-compose --profile postgres up --build
    fi
}

# Function to start production environment
start_prod() {
    print_header "Starting Production Environment"
    check_docker
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from example..."
        if [ -f "../cicd/environments/env.production" ]; then
            cp ../cicd/environments/env.production .env
            print_warning "Please edit .env file with your production values before continuing."
            exit 1
        else
            print_error ".env file not found and no example available."
            exit 1
        fi
    fi
    
    if [ "$DETACH" = true ]; then
        docker-compose -f docker-compose.yml up -d
    else
        docker-compose -f docker-compose.yml up
    fi
}

# Function to build Docker images
build_images() {
    print_header "Building Docker Images"
    check_docker
    
    if [ "$FORCE" = true ]; then
        docker-compose build --no-cache
    else
        docker-compose build
    fi
}

# Function to stop containers
stop_containers() {
    print_header "Stopping Containers"
    docker-compose down
    docker-compose -f docker-compose.yml down
}

# Function to clean up
clean_up() {
    print_header "Cleaning Up Containers and Volumes"
    docker-compose down -v
    docker-compose -f docker-compose.yml down -v
    docker system prune -f
}

# Function to view logs
view_logs() {
    print_header "Viewing Application Logs"
    docker-compose logs -f backend
}

# Function to access container shell
access_shell() {
    print_header "Accessing Container Shell"
    docker-compose exec backend sh
}

# Function to run migrations
run_migrations() {
    print_header "Running Database Migrations"
    docker-compose exec backend npm run migrate
}

# Function to seed database
seed_database() {
    print_header "Seeding Database"
    docker-compose exec backend npm run seed
}

# Function to check health
check_health() {
    print_header "Checking Application Health"
    
    # Check if containers are running
    if docker-compose ps | grep -q "Up"; then
        print_status "Containers are running"
        
        # Check application health
        if curl -f http://10.170.0.4:3001/api/monitoring/health > /dev/null 2>&1; then
            print_status "Application is healthy"
            curl -s http://10.170.0.4:3001/api/monitoring/health | jq .
        else
            print_error "Application health check failed"
        fi
    else
        print_error "Containers are not running"
    fi
}

# Parse command line arguments
COMMAND=""
DETACH=false
FORCE=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        dev|dev-pg|prod|build|stop|clean|logs|shell|migrate|seed|health|help)
            COMMAND="$1"
            shift
            ;;
        -d|--detach)
            DETACH=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Set verbose mode
if [ "$VERBOSE" = true ]; then
    set -x
fi

# Execute command
case $COMMAND in
    dev)
        start_dev
        ;;
    dev-pg)
        start_dev_pg
        ;;
    prod)
        start_prod
        ;;
    build)
        build_images
        ;;
    stop)
        stop_containers
        ;;
    clean)
        clean_up
        ;;
    logs)
        view_logs
        ;;
    shell)
        access_shell
        ;;
    migrate)
        run_migrations
        ;;
    seed)
        seed_database
        ;;
    health)
        check_health
        ;;
    help|"")
        show_usage
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        show_usage
        exit 1
        ;;
esac
