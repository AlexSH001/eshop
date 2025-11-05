#!/bin/bash

# E-Shop Helm Chart Deployment Script
# This script provides easy deployment options for different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
CHART_PATH="./eshop"
RELEASE_NAME="eshop"
NAMESPACE=""
ENVIRONMENT="development"
VALUES_FILE=""
DRY_RUN=false
UPGRADE=false

# Function to show usage
show_usage() {
    echo -e "${BLUE}E-Shop Helm Chart Deployment Script${NC}"
    echo "=========================================="
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Environment (dev|staging|production) [default: development]"
    echo "  -r, --release NAME       Release name [default: eshop]"
    echo "  -n, --namespace NAME     Kubernetes namespace [default: release name]"
    echo "  -f, --values FILE        Custom values file"
    echo "  -d, --dry-run           Dry run mode"
    echo "  -u, --upgrade           Upgrade existing release"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --environment dev                    # Deploy development environment"
    echo "  $0 --environment production --upgrade   # Upgrade production deployment"
    echo "  $0 --values custom-values.yaml         # Deploy with custom values"
    echo ""
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if Helm is installed
    if ! command -v helm &> /dev/null; then
        echo -e "${RED}❌ Helm is not installed. Please install Helm first.${NC}"
        exit 1
    fi
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}❌ kubectl is not installed. Please install kubectl first.${NC}"
        exit 1
    fi
    
    # Check if kubectl is configured
    if ! kubectl cluster-info &> /dev/null; then
        echo -e "${RED}❌ kubectl is not configured. Please configure kubectl first.${NC}"
        exit 1
    fi
    
    # Check if chart directory exists
    if [ ! -d "$CHART_PATH" ]; then
        echo -e "${RED}❌ Chart directory not found: $CHART_PATH${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to get values file based on environment
get_values_file() {
    case $ENVIRONMENT in
        "dev"|"development")
            VALUES_FILE="$CHART_PATH/values-dev.yaml"
            ;;
        "staging")
            VALUES_FILE="$CHART_PATH/values-staging.yaml"
            ;;
        "prod"|"production")
            VALUES_FILE="$CHART_PATH/values-production.yaml"
            ;;
        *)
            echo -e "${RED}❌ Unknown environment: $ENVIRONMENT${NC}"
            exit 1
            ;;
    esac
    
    # Check if values file exists
    if [ ! -f "$VALUES_FILE" ]; then
        echo -e "${YELLOW}⚠️  Values file not found: $VALUES_FILE${NC}"
        echo -e "${YELLOW}   Using default values.yaml${NC}"
        VALUES_FILE="$CHART_PATH/values.yaml"
    fi
}

# Function to validate values file
validate_values_file() {
    echo -e "${BLUE}🔍 Validating values file...${NC}"
    
    if [ ! -f "$VALUES_FILE" ]; then
        echo -e "${RED}❌ Values file not found: $VALUES_FILE${NC}"
        exit 1
    fi
    
    # Check for required values
    if grep -q "CHANGE_THIS" "$VALUES_FILE"; then
        echo -e "${YELLOW}⚠️  Warning: Values file contains placeholder values that should be changed${NC}"
        echo -e "${YELLOW}   Please review and update: $VALUES_FILE${NC}"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Values file validation passed${NC}"
}

# Function to create namespace if it doesn't exist
create_namespace() {
    if [ -n "$NAMESPACE" ]; then
        echo -e "${BLUE}🔍 Checking namespace...${NC}"
        
        if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
            echo -e "${YELLOW}⚠️  Namespace $NAMESPACE does not exist. Creating...${NC}"
            kubectl create namespace "$NAMESPACE"
            echo -e "${GREEN}✅ Namespace $NAMESPACE created${NC}"
        else
            echo -e "${GREEN}✅ Namespace $NAMESPACE exists${NC}"
        fi
    fi
}

# Function to deploy the chart
deploy_chart() {
    echo -e "${BLUE}🚀 Deploying E-Shop application...${NC}"
    echo -e "Environment: ${GREEN}$ENVIRONMENT${NC}"
    echo -e "Release name: ${GREEN}$RELEASE_NAME${NC}"
    echo -e "Values file: ${GREEN}$VALUES_FILE${NC}"
    echo -e "Namespace: ${GREEN}${NAMESPACE:-$RELEASE_NAME}${NC}"
    
    # Build helm command
    HELM_CMD="helm"
    
    if [ "$DRY_RUN" = true ]; then
        HELM_CMD="$HELM_CMD --dry-run"
        echo -e "${YELLOW}🔍 Running in dry-run mode${NC}"
    fi
    
    if [ "$UPGRADE" = true ]; then
        HELM_CMD="$HELM_CMD upgrade"
    else
        HELM_CMD="$HELM_CMD install"
    fi
    
    HELM_CMD="$HELM_CMD $RELEASE_NAME $CHART_PATH"
    
    if [ -n "$NAMESPACE" ]; then
        HELM_CMD="$HELM_CMD --namespace $NAMESPACE"
    fi
    
    if [ -n "$VALUES_FILE" ]; then
        HELM_CMD="$HELM_CMD -f $VALUES_FILE"
    fi
    
    echo -e "${BLUE}Executing: $HELM_CMD${NC}"
    echo ""
    
    # Execute helm command
    if eval "$HELM_CMD"; then
        echo -e "${GREEN}✅ Deployment successful!${NC}"
    else
        echo -e "${RED}❌ Deployment failed${NC}"
        exit 1
    fi
}

# Function to show deployment status
show_status() {
    echo -e "${BLUE}📊 Deployment Status${NC}"
    echo "=================="
    
    if [ -n "$NAMESPACE" ]; then
        kubectl get all -n "$NAMESPACE" -l "app.kubernetes.io/instance=$RELEASE_NAME"
    else
        kubectl get all -l "app.kubernetes.io/instance=$RELEASE_NAME"
    fi
    
    echo ""
    echo -e "${BLUE}🔍 Pod Status${NC}"
    echo "============"
    
    if [ -n "$NAMESPACE" ]; then
        kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/instance=$RELEASE_NAME"
    else
        kubectl get pods -l "app.kubernetes.io/instance=$RELEASE_NAME"
    fi
    
    echo ""
    echo -e "${BLUE}🔗 Services${NC}"
    echo "=========="
    
    if [ -n "$NAMESPACE" ]; then
        kubectl get services -n "$NAMESPACE" -l "app.kubernetes.io/instance=$RELEASE_NAME"
    else
        kubectl get services -l "app.kubernetes.io/instance=$RELEASE_NAME"
    fi
    
    echo ""
    echo -e "${BLUE}💾 Persistent Volumes${NC}"
    echo "====================="
    
    if [ -n "$NAMESPACE" ]; then
        kubectl get pvc -n "$NAMESPACE" -l "app.kubernetes.io/instance=$RELEASE_NAME"
    else
        kubectl get pvc -l "app.kubernetes.io/instance=$RELEASE_NAME"
    fi
}

# Function to show access information
show_access_info() {
    echo -e "${BLUE}🌐 Access Information${NC}"
    echo "==================="
    
    # Get ingress information
    if [ -n "$NAMESPACE" ]; then
        INGRESS=$(kubectl get ingress -n "$NAMESPACE" -l "app.kubernetes.io/instance=$RELEASE_NAME" -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null || echo "")
    else
        INGRESS=$(kubectl get ingress -l "app.kubernetes.io/instance=$RELEASE_NAME" -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null || echo "")
    fi
    
    if [ -n "$INGRESS" ]; then
        echo -e "🌐 Web Application: ${GREEN}https://$INGRESS${NC}"
        echo -e "🔌 API Endpoint: ${GREEN}https://$INGRESS/api${NC}"
    else
        echo -e "🔌 Backend API: ${GREEN}kubectl port-forward -n ${NAMESPACE:-$RELEASE_NAME} svc/$RELEASE_NAME-backend 3001:3001${NC}"
        echo -e "🌐 Frontend: ${GREEN}kubectl port-forward -n ${NAMESPACE:-$RELEASE_NAME} svc/$RELEASE_NAME-frontend 3000:3000${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📊 Monitoring Endpoints${NC}"
    echo "======================="
    echo -e "🏥 Health Check: ${GREEN}kubectl port-forward -n ${NAMESPACE:-$RELEASE_NAME} svc/$RELEASE_NAME-backend 3001:3001 && curl http://10.170.0.4:3001/api/monitoring/health${NC}"
    echo -e "📈 Metrics: ${GREEN}kubectl port-forward -n ${NAMESPACE:-$RELEASE_NAME} svc/$RELEASE_NAME-backend 3001:3001 && curl http://10.170.0.4:3001/api/monitoring/metrics${NC}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--release)
            RELEASE_NAME="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -f|--values)
            VALUES_FILE="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -u|--upgrade)
            UPGRADE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo -e "${BLUE}🚀 E-Shop Helm Chart Deployment${NC}"
    echo "================================="
    echo ""
    
    check_prerequisites
    
    if [ -z "$VALUES_FILE" ]; then
        get_values_file
    fi
    
    validate_values_file
    create_namespace
    deploy_chart
    
    if [ "$DRY_RUN" = false ]; then
        echo ""
        show_status
        echo ""
        show_access_info
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
}

# Run main function
main "$@" 