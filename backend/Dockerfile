# ========================================
# E-Shop Backend Dockerfile
# ========================================
# Multi-stage build for optimized production image
# Supports both SQLite (development) and PostgreSQL (production)

# ========================================
# Stage 1: Base Image with Dependencies
# ========================================
FROM node:18-alpine AS base

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    postgresql-client \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# ========================================
# Stage 2: Dependencies Installation
# ========================================
FROM base AS dependencies

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build tools)
RUN npm ci --include=dev && npm cache clean --force

# ========================================
# Stage 3: Build Stage (if needed)
# ========================================
FROM dependencies AS build

# Copy source code
COPY . .

# Run any build scripts if needed
# (Currently no build step required based on package.json)
RUN npm run build || echo "No build step required"

# ========================================
# Stage 4: Production Image
# ========================================
FROM base AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create necessary directories with proper permissions
RUN mkdir -p /app/data /app/uploads /app/logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# ========================================
# Environment Configuration
# ========================================
# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_CLIENT=postgres
ENV UPLOAD_DIR=/app/uploads
ENV LOG_FILE_PATH=/app/logs

# ========================================
# Health Check
# ========================================
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f https://fortunewhisper.com/backend/api/monitoring/health || exit 1

# ========================================
# Expose Port
# ========================================
EXPOSE 3001

# ========================================
# Startup Script
# ========================================
# Create startup script for database initialization
RUN chmod +x /app/start.sh && \
    chown nodejs:nodejs /app/start.sh

# ========================================
# Start Application
# ========================================
CMD ["sh", "/app/start.sh"]
