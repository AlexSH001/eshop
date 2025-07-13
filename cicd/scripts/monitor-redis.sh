#!/bin/bash

# Redis Monitoring Script for E-commerce Application
# This script monitors Redis health and performance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_CONTAINER_NAME="${REDIS_CONTAINER_NAME:-eshop-redis}"

# Function to check if Redis is running
check_redis_running() {
    echo -e "${BLUE}🔍 Checking Redis status...${NC}"
    
    if docker ps | grep -q ${REDIS_CONTAINER_NAME}; then
        echo -e "${GREEN}✅ Redis container is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Redis container is not running${NC}"
        return 1
    fi
}

# Function to test Redis connection
test_redis_connection() {
    echo -e "${BLUE}🔗 Testing Redis connection...${NC}"
    
    if [ -n "$REDIS_PASSWORD" ]; then
        if docker exec ${REDIS_CONTAINER_NAME} redis-cli -a ${REDIS_PASSWORD} ping | grep -q "PONG"; then
            echo -e "${GREEN}✅ Redis connection successful${NC}"
            return 0
        else
            echo -e "${RED}❌ Redis connection failed${NC}"
            return 1
        fi
    else
        if docker exec ${REDIS_CONTAINER_NAME} redis-cli ping | grep -q "PONG"; then
            echo -e "${GREEN}✅ Redis connection successful${NC}"
            return 0
        else
            echo -e "${RED}❌ Redis connection failed${NC}"
            return 1
        fi
    fi
}

# Function to get Redis info
get_redis_info() {
    echo -e "${BLUE}📊 Redis Information${NC}"
    echo "=================="
    
    if [ -n "$REDIS_PASSWORD" ]; then
        docker exec ${REDIS_CONTAINER_NAME} redis-cli -a ${REDIS_PASSWORD} info | grep -E "(redis_version|connected_clients|used_memory_human|total_commands_processed|keyspace_hits|keyspace_misses|uptime_in_seconds)"
    else
        docker exec ${REDIS_CONTAINER_NAME} redis-cli info | grep -E "(redis_version|connected_clients|used_memory_human|total_commands_processed|keyspace_hits|keyspace_misses|uptime_in_seconds)"
    fi
}

# Function to get memory usage
get_memory_usage() {
    echo -e "${BLUE}💾 Memory Usage${NC}"
    echo "=============="
    
    if [ -n "$REDIS_PASSWORD" ]; then
        docker exec ${REDIS_CONTAINER_NAME} redis-cli -a ${REDIS_PASSWORD} info memory | grep -E "(used_memory|used_memory_human|used_memory_peak|used_memory_peak_human|maxmemory|maxmemory_policy)"
    else
        docker exec ${REDIS_CONTAINER_NAME} redis-cli info memory | grep -E "(used_memory|used_memory_human|used_memory_peak|used_memory_peak_human|maxmemory|maxmemory_policy)"
    fi
}

# Function to get client connections
get_client_connections() {
    echo -e "${BLUE}👥 Client Connections${NC}"
    echo "====================="
    
    if [ -n "$REDIS_PASSWORD" ]; then
        docker exec ${REDIS_CONTAINER_NAME} redis-cli -a ${REDIS_PASSWORD} client list | wc -l
        echo "active connections"
    else
        docker exec ${REDIS_CONTAINER_NAME} redis-cli client list | wc -l
        echo "active connections"
    fi
}

# Function to get cache statistics
get_cache_stats() {
    echo -e "${BLUE}📈 Cache Statistics${NC}"
    echo "==================="
    
    if [ -n "$REDIS_PASSWORD" ]; then
        docker exec ${REDIS_CONTAINER_NAME} redis-cli -a ${REDIS_PASSWORD} info stats | grep -E "(keyspace_hits|keyspace_misses|total_commands_processed|total_connections_received|rejected_connections)"
    else
        docker exec ${REDIS_CONTAINER_NAME} redis-cli info stats | grep -E "(keyspace_hits|keyspace_misses|total_commands_processed|total_connections_received|rejected_connections)"
    fi
}

# Function to get slow queries
get_slow_queries() {
    echo -e "${BLUE}🐌 Slow Queries${NC}"
    echo "=============="
    
    if [ -n "$REDIS_PASSWORD" ]; then
        docker exec ${REDIS_CONTAINER_NAME} redis-cli -a ${REDIS_PASSWORD} slowlog get 5
    else
        docker exec ${REDIS_CONTAINER_NAME} redis-cli slowlog get 5
    fi
}

# Function to get application cache keys
get_cache_keys() {
    echo -e "${BLUE}🔑 Application Cache Keys${NC}"
    echo "========================"
    
    if [ -n "$REDIS_PASSWORD" ]; then
        docker exec ${REDIS_CONTAINER_NAME} redis-cli -a ${REDIS_PASSWORD} keys "eshop:*" | wc -l
        echo "application cache keys"
        
        echo -e "${YELLOW}Key patterns:${NC}"
        docker exec ${REDIS_CONTAINER_NAME} redis-cli -a ${REDIS_PASSWORD} keys "eshop:product:*" | wc -l
        echo "product keys"
        
        docker exec ${REDIS_CONTAINER_NAME} redis-cli -a ${REDIS_PASSWORD} keys "eshop:category:*" | wc -l
        echo "category keys"
        
        docker exec ${REDIS_CONTAINER_NAME} redis-cli -a ${REDIS_PASSWORD} keys "eshop:user:*" | wc -l
        echo "user keys"
    else
        docker exec ${REDIS_CONTAINER_NAME} redis-cli keys "eshop:*" | wc -l
        echo "application cache keys"
        
        echo -e "${YELLOW}Key patterns:${NC}"
        docker exec ${REDIS_CONTAINER_NAME} redis-cli keys "eshop:product:*" | wc -l
        echo "product keys"
        
        docker exec ${REDIS_CONTAINER_NAME} redis-cli keys "eshop:category:*" | wc -l
        echo "category keys"
        
        docker exec ${REDIS_CONTAINER_NAME} redis-cli keys "eshop:user:*" | wc -l
        echo "user keys"
    fi
}

# Function to check Redis logs
check_redis_logs() {
    echo -e "${BLUE}📝 Recent Redis Logs${NC}"
    echo "===================="
    
    docker logs --tail 10 ${REDIS_CONTAINER_NAME}
}

# Function to perform health check
health_check() {
    echo -e "${BLUE}🏥 Redis Health Check${NC}"
    echo "===================="
    
    local status=0
    
    # Check if container is running
    if ! check_redis_running; then
        status=1
    fi
    
    # Test connection
    if ! test_redis_connection; then
        status=1
    fi
    
    # Check memory usage
    local memory_usage=$(docker exec ${REDIS_CONTAINER_NAME} redis-cli ${REDIS_PASSWORD:+-a $REDIS_PASSWORD} info memory | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
    echo -e "Memory usage: ${memory_usage}"
    
    # Check hit rate
    local hits=$(docker exec ${REDIS_CONTAINER_NAME} redis-cli ${REDIS_PASSWORD:+-a $REDIS_PASSWORD} info stats | grep "keyspace_hits" | cut -d: -f2 | tr -d '\r')
    local misses=$(docker exec ${REDIS_CONTAINER_NAME} redis-cli ${REDIS_PASSWORD:+-a $REDIS_PASSWORD} info stats | grep "keyspace_misses" | cut -d: -f2 | tr -d '\r')
    
    if [ "$hits" -gt 0 ] || [ "$misses" -gt 0 ]; then
        local total=$((hits + misses))
        local hit_rate=$(echo "scale=2; $hits * 100 / $total" | bc -l 2>/dev/null || echo "0")
        echo -e "Cache hit rate: ${hit_rate}%"
        
        if (( $(echo "$hit_rate < 80" | bc -l 2>/dev/null || echo "1") )); then
            echo -e "${YELLOW}⚠️  Low cache hit rate detected${NC}"
        fi
    fi
    
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}✅ Redis is healthy${NC}"
    else
        echo -e "${RED}❌ Redis health check failed${NC}"
    fi
    
    return $status
}

# Function to show monitoring menu
show_menu() {
    echo -e "${BLUE}📊 Redis Monitoring Menu${NC}"
    echo "========================"
    echo "1. Health Check"
    echo "2. Redis Information"
    echo "3. Memory Usage"
    echo "4. Client Connections"
    echo "5. Cache Statistics"
    echo "6. Slow Queries"
    echo "7. Cache Keys"
    echo "8. Redis Logs"
    echo "9. Full Report"
    echo "0. Exit"
    echo ""
    read -p "Select an option: " choice
}

# Function to generate full report
generate_full_report() {
    echo -e "${BLUE}📋 Redis Full Report${NC}"
    echo "===================="
    echo "Generated on: $(date)"
    echo ""
    
    health_check
    echo ""
    get_redis_info
    echo ""
    get_memory_usage
    echo ""
    get_client_connections
    echo ""
    get_cache_stats
    echo ""
    get_cache_keys
    echo ""
    get_slow_queries
    echo ""
    check_redis_logs
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Redis Monitoring Script${NC}"
    echo "========================="
    
    # Check if container name is provided
    if [ -z "$REDIS_CONTAINER_NAME" ]; then
        echo -e "${RED}❌ REDIS_CONTAINER_NAME environment variable is required${NC}"
        exit 1
    fi
    
    # Check if Redis is running
    if ! check_redis_running; then
        echo -e "${RED}❌ Redis is not running. Please start Redis first.${NC}"
        exit 1
    fi
    
    # Interactive menu
    while true; do
        show_menu
        
        case $choice in
            1)
                health_check
                ;;
            2)
                get_redis_info
                ;;
            3)
                get_memory_usage
                ;;
            4)
                get_client_connections
                ;;
            5)
                get_cache_stats
                ;;
            6)
                get_slow_queries
                ;;
            7)
                get_cache_keys
                ;;
            8)
                check_redis_logs
                ;;
            9)
                generate_full_report
                ;;
            0)
                echo -e "${GREEN}👋 Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Invalid option${NC}"
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
        clear
    done
}

# Check if script is run with arguments
if [ $# -gt 0 ]; then
    case $1 in
        "health")
            health_check
            ;;
        "info")
            get_redis_info
            ;;
        "memory")
            get_memory_usage
            ;;
        "stats")
            get_cache_stats
            ;;
        "report")
            generate_full_report
            ;;
        *)
            echo "Usage: $0 [health|info|memory|stats|report]"
            exit 1
            ;;
    esac
else
    main
fi 