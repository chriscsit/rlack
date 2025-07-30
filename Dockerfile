# Multi-stage Docker build for Rlack application

# Stage 1: Build dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/web/package*.json ./packages/web/
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Build application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/web/package*.json ./packages/web/

# Install all dependencies (including dev dependencies for building)
RUN npm install

# Copy source code
COPY . .

# Build the applications
RUN npm run build:backend
RUN npm run build:web

# Stage 3: Production runtime
FROM node:20-alpine AS production
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S rlack -u 1001

# Copy production dependencies
COPY --from=dependencies --chown=rlack:nodejs /app/node_modules ./node_modules
COPY --from=dependencies --chown=rlack:nodejs /app/packages/backend/node_modules ./packages/backend/node_modules

# Copy built applications
COPY --from=builder --chown=rlack:nodejs /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder --chown=rlack:nodejs /app/packages/web/dist ./packages/web/dist
COPY --from=builder --chown=rlack:nodejs /app/packages/backend/prisma ./packages/backend/prisma
COPY --from=builder --chown=rlack:nodejs /app/packages/backend/package.json ./packages/backend/
COPY --from=builder --chown=rlack:nodejs /app/package.json ./

# Create uploads directory
RUN mkdir -p /app/packages/backend/uploads && chown rlack:nodejs /app/packages/backend/uploads

# Switch to non-root user
USER rlack

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node packages/backend/dist/health-check.js

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "packages/backend/dist/index.js"]