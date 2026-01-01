# ============================================
# Echelon Agents - Production Dockerfile
# ============================================
# Builds the agents package including the Oracle Sync Service
#
# Build:   docker build -t echelon-agents .
# Run:     docker run --env-file .env echelon-agents
# ============================================

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# ============================================
# Production image
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S echelon && \
    adduser -S echelon -u 1001

# Copy built application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Copy source for tsx (development mode)
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

# Install tsx for development mode execution
RUN npm install -g tsx

# Create state directory with proper permissions
RUN mkdir -p /app/state && chown -R echelon:echelon /app

# Switch to non-root user
USER echelon

# Environment variables (override with --env-file or -e)
ENV NODE_ENV=production
ENV ORACLE_SYNC_INTERVAL_MS=300000
ENV ORACLE_SYNC_BATCH_SIZE=50

# Health check - verify the process is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD pgrep -f "oracle-sync" || exit 1

# Default command: run oracle sync service
CMD ["tsx", "src/services/oracle-sync.ts"]
