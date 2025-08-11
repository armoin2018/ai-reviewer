# Multi-stage build for development and production

# Base stage - common dependencies
FROM node:20-alpine AS base
WORKDIR /app

# Install system dependencies for development tools
RUN apk add --no-cache git

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Development stage - includes dev dependencies and hot reload
FROM base AS development
ENV NODE_ENV=development

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port for development server
EXPOSE 8080
EXPOSE 9229

# Use tsx for hot reload in development
CMD ["npm", "run", "dev"]

# Build stage - compile TypeScript
FROM base AS build
ENV NODE_ENV=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage - minimal runtime image
FROM node:20-alpine AS production
ENV NODE_ENV=production

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application from build stage
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/bundled ./bundled

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "dist/server.js"]
