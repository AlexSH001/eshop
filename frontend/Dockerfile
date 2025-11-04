# ========================================
# E-Shop Frontend Dockerfile
# ========================================
# Multi-stage build for optimized Next.js production image
# Supports both development and production environments

# ========================================
# Stage 1: Base Image with Dependencies
# ========================================
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    curl \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# ========================================
# Stage 2: Dependencies Installation
# ========================================
FROM base AS dependencies

# Copy package files
COPY package*.json ./
COPY bun.lock* ./

# Install dependencies using npm (fallback if bun is not available)
RUN npm ci --include=dev && npm cache clean --force

# ========================================
# Stage 3: Build Stage
# ========================================
FROM dependencies AS build

# Copy source code
COPY . .

# Set environment variables for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# ========================================
# Stage 4: Production Image
# ========================================
FROM base AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from build stage
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
#COPY --from=build --chown=nextjs:nodejs /app/public ./public

# Create necessary directories with proper permissions
RUN mkdir -p /app/.next/cache && \
    chown -R nextjs:nodejs /app

# ========================================
# Startup Script
# ========================================
# Create startup script for application initialization
# (Must be created as root before switching to nextjs user)
RUN printf '#!/bin/sh\n\
echo "🚀 Starting E-Shop Frontend..."\n\
echo "📊 Environment: $NODE_ENV"\n\
echo "🌐 Port: $PORT"\n\
echo "🏠 Hostname: $HOSTNAME"\n\
echo "🔗 API URL: $NEXT_PUBLIC_API_URL"\n\
echo "🏪 App URL: $NEXT_PUBLIC_APP_URL"\n\
\n\
# Start the application\n\
echo "🚀 Starting Next.js application..."\n\
exec node server.js\n' > /app/start.sh && \
    chmod +x /app/start.sh && \
    chown nextjs:nodejs /app/start.sh

# ========================================
# Switch to non-root user
# ========================================
USER nextjs

# ========================================
# Environment Configuration
# ========================================
# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# ========================================
# Health Check
# ========================================
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# ========================================
# Expose Port
# ========================================
EXPOSE 3000

# ========================================
# Start Application
# ========================================
CMD ["sh", "/app/start.sh"]