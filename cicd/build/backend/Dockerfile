# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ curl

# Set working directory
WORKDIR /app

# Copy package files
COPY ../../backend/package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY ../../backend/ .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Create necessary directories
RUN mkdir -p /app/data /app/uploads /app/logs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start the application
CMD ["npm", "start"] 