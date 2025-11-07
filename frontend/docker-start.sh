#!/bin/bash

# ========================================
# E-Shop Frontend Docker Startup Script
# ========================================
# Script to build and run the frontend container

set -e

echo "🚀 E-Shop Frontend Docker Setup"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_success "Docker and Docker Compose are available"

# Create environment file if it doesn't exist
if [ ! -f ".env.local" ]; then
    print_status "Creating .env.local file..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=https://backend.fortunewhisper.com/api
NEXT_PUBLIC_APP_NAME=E-Shop
NEXT_PUBLIC_APP_URL=https://www.fortunewhisper.com
EOF
    print_success "Created .env.local"
fi

# Function to build the container
build_container() {
    print_status "Building frontend container..."
    docker build -t eshop-frontend .
    print_success "Frontend container built successfully"
}

# Function to run the container
run_container() {
    print_status "Starting frontend container..."
    docker run -d \
        --name eshop-frontend \
        --network eshop-network \
        -p 3000:3000 \
        -e NODE_ENV=production \
        -e NEXT_PUBLIC_API_URL=https://backend.fortunewhisper.com/api \
        -e NEXT_PUBLIC_APP_NAME="E-Shop" \
        -e NEXT_PUBLIC_APP_URL=https://www.fortunewhisper.com \
        eshop-frontend
    print_success "Frontend container started successfully"
}

# Function to run with docker-compose
run_with_compose() {
    print_status "Starting frontend with Docker Compose..."
    docker-compose up -d
    print_success "Frontend started with Docker Compose"
}

# Function to run development mode
run_development() {
    print_status "Starting frontend in development mode..."
    docker-compose --profile development up -d frontend-dev
    print_success "Frontend development server started"
}

# Function to show logs
show_logs() {
    print_status "Showing frontend logs..."
    docker logs -f eshop-frontend
}

# Function to stop containers
stop_containers() {
    print_status "Stopping frontend containers..."
    docker-compose down
    docker stop eshop-frontend 2>/dev/null || true
    docker rm eshop-frontend 2>/dev/null || true
    print_success "Frontend containers stopped"
}

# Function to clean up
cleanup() {
    print_status "Cleaning up containers and images..."
    docker-compose down --rmi all
    docker stop eshop-frontend 2>/dev/null || true
    docker rm eshop-frontend 2>/dev/null || true
    docker rmi eshop-frontend 2>/dev/null || true
    print_success "Cleanup completed"
}

# Function to show status
show_status() {
    print_status "Container status:"
    docker ps --filter "name=eshop-frontend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build       Build the frontend container"
    echo "  run         Run the frontend container"
    echo "  start       Start with Docker Compose"
    echo "  dev         Start in development mode"
    echo "  logs        Show container logs"
    echo "  stop        Stop all containers"
    echo "  cleanup     Clean up containers and images"
    echo "  status      Show container status"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build    # Build the container"
    echo "  $0 start    # Start with Docker Compose"
    echo "  $0 dev      # Start in development mode"
    echo "  $0 logs     # Show logs"
}

# Main script logic
case "${1:-help}" in
    build)
        build_container
        ;;
    run)
        build_container
        run_container
        ;;
    start)
        run_with_compose
        ;;
    dev)
        run_development
        ;;
    logs)
        show_logs
        ;;
    stop)
        stop_containers
        ;;
    cleanup)
        cleanup
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac

echo ""
print_success "Frontend setup completed!"
echo ""
echo "🌐 Frontend will be available at: https://www.fortunewhisper.com"
echo "🔗 Make sure the backend is running on: https://backend.fortunewhisper.com"
echo ""
echo "📋 Useful commands:"
echo "  $0 logs     # View logs"
echo "  $0 status   # Check status"
echo "  $0 stop     # Stop containers"
