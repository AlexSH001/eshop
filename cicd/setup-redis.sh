#!/bin/bash

# Redis Setup Script for E-commerce Application
# This script sets up Redis for local development and production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REDIS_VERSION="7-alpine"
REDIS_PORT="6379"
REDIS_PASSWORD="eshop_redis_password_$(date +%s)"
REDIS_CONTAINER_NAME="eshop-redis"
REDIS_DATA_DIR="./redis-data"

echo -e "${BLUE}🚀 Redis Setup Script for E-commerce Application${NC}"
echo "=================================================="

# Function to check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker is installed and running${NC}"
}

# Function to check if Docker Compose is installed
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${YELLOW}⚠️  Docker Compose not found, using docker run instead${NC}"
        return 1
    fi
    echo -e "${GREEN}✅ Docker Compose is available${NC}"
    return 0
}

# Function to create docker-compose.yml
create_docker_compose() {
    cat > docker-compose.yml << EOF
version: '3.8'

services:
  redis:
    image: redis:${REDIS_VERSION}
    container_name: ${REDIS_CONTAINER_NAME}
    ports:
      - "${REDIS_PORT}:6379"
    volumes:
      - ${REDIS_DATA_DIR}:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - eshop-network

networks:
  eshop-network:
    driver: bridge

volumes:
  redis-data:
    driver: local
EOF

    echo -e "${GREEN}✅ Created docker-compose.yml${NC}"
}

# Function to setup with Docker Compose
setup_with_docker_compose() {
    echo -e "${BLUE}📦 Setting up Redis with Docker Compose...${NC}"
    
    create_docker_compose
    
    # Create data directory
    mkdir -p ${REDIS_DATA_DIR}
    
    # Start Redis
    docker-compose up -d redis
    
    # Wait for Redis to be ready
    echo -e "${YELLOW}⏳ Waiting for Redis to be ready...${NC}"
    sleep 5
    
    # Test connection
    if docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} ping | grep -q "PONG"; then
        echo -e "${GREEN}✅ Redis is running and responding${NC}"
    else
        echo -e "${RED}❌ Redis is not responding${NC}"
        exit 1
    fi
}

# Function to setup with Docker Run
setup_with_docker_run() {
    echo -e "${BLUE}📦 Setting up Redis with Docker Run...${NC}"
    
    # Create data directory
    mkdir -p ${REDIS_DATA_DIR}
    
    # Stop existing container if running
    docker stop ${REDIS_CONTAINER_NAME} 2>/dev/null || true
    docker rm ${REDIS_CONTAINER_NAME} 2>/dev/null || true
    
    # Start Redis container
    docker run -d \
        --name ${REDIS_CONTAINER_NAME} \
        --network host \
        -v $(pwd)/${REDIS_DATA_DIR}:/data \
        redis:${REDIS_VERSION} \
        redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    
    # Wait for Redis to be ready
    echo -e "${YELLOW}⏳ Waiting for Redis to be ready...${NC}"
    sleep 5
    
    # Test connection
    if docker exec ${REDIS_CONTAINER_NAME} redis-cli -a ${REDIS_PASSWORD} ping | grep -q "PONG"; then
        echo -e "${GREEN}✅ Redis is running and responding${NC}"
    else
        echo -e "${RED}❌ Redis is not responding${NC}"
        exit 1
    fi
}

# Function to create environment file
create_env_file() {
    cat > .env.redis << EOF
# Redis Configuration for E-commerce Application
# Generated on $(date)

# Redis Connection
REDIS_HOST=localhost
REDIS_PORT=${REDIS_PORT}
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_DB=0
REDIS_TLS=false

# Redis Pool Configuration
REDIS_POOL_MAX=20
REDIS_POOL_IDLE_TIMEOUT=30000
REDIS_POOL_CONNECTION_TIMEOUT=2000

# Application Cache Settings
CACHE_TTL_PRODUCTS=3600
CACHE_TTL_CATEGORIES=7200
CACHE_TTL_USERS=1800
CACHE_TTL_SEARCH=900
EOF

    echo -e "${GREEN}✅ Created .env.redis file${NC}"
}

# Function to test Redis functionality
test_redis() {
    echo -e "${BLUE}🧪 Testing Redis functionality...${NC}"
    
    # Test basic operations
    docker exec ${REDIS_CONTAINER_NAME} redis-cli -a ${REDIS_PASSWORD} << EOF
SET test:key "Hello Redis"
GET test:key
DEL test:key
PING
INFO memory
INFO clients
EOF
    
    echo -e "${GREEN}✅ Redis functionality test completed${NC}"
}

# Function to show connection information
show_connection_info() {
    echo -e "${BLUE}📋 Redis Connection Information${NC}"
    echo "=================================="
    echo -e "Host: ${GREEN}localhost${NC}"
    echo -e "Port: ${GREEN}${REDIS_PORT}${NC}"
    echo -e "Password: ${GREEN}${REDIS_PASSWORD}${NC}"
    echo -e "Database: ${GREEN}0${NC}"
    echo ""
    echo -e "${YELLOW}🔗 Connection URL:${NC}"
    echo -e "redis://:${REDIS_PASSWORD}@localhost:${REDIS_PORT}/0"
    echo ""
    echo -e "${YELLOW}🔧 Docker Commands:${NC}"
    echo -e "Stop Redis: ${GREEN}docker stop ${REDIS_CONTAINER_NAME}${NC}"
    echo -e "Start Redis: ${GREEN}docker start ${REDIS_CONTAINER_NAME}${NC}"
    echo -e "View logs: ${GREEN}docker logs ${REDIS_CONTAINER_NAME}${NC}"
    echo -e "Connect CLI: ${GREEN}docker exec -it ${REDIS_CONTAINER_NAME} redis-cli -a ${REDIS_PASSWORD}${NC}"
    echo ""
    echo -e "${YELLOW}📁 Data Directory:${NC}"
    echo -e "${GREEN}$(pwd)/${REDIS_DATA_DIR}${NC}"
}

# Function to show next steps
show_next_steps() {
    echo -e "${BLUE}🚀 Next Steps${NC}"
    echo "============="
    echo -e "1. ${GREEN}Copy the environment variables to your .env file${NC}"
    echo -e "2. ${GREEN}Test the application with Redis caching${NC}"
    echo -e "3. ${GREEN}Monitor Redis performance${NC}"
    echo -e "4. ${GREEN}Set up Redis monitoring and alerting${NC}"
    echo ""
    echo -e "${YELLOW}📖 Documentation:${NC}"
    echo -e "See ${GREEN}deployment/redis-deployment-guide.md${NC} for detailed information"
}

# Main execution
main() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    check_docker
    
    if check_docker_compose; then
        setup_with_docker_compose
    else
        setup_with_docker_run
    fi
    
    create_env_file
    test_redis
    show_connection_info
    show_next_steps
    
    echo -e "${GREEN}🎉 Redis setup completed successfully!${NC}"
}

# Run main function
main "$@" 