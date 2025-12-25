# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
ENV NODE_ENV=production
ENV STANDALONE=true
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# Install build dependencies for better-sqlite3 and runtime tools
RUN apk add --no-cache python3 make g++ curl su-exec

# Environment variables
ENV DATA_DIR=/data
ENV NODE_ENV=production
ENV PORT=4173
ENV HOST=0.0.0.0

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Clean up build dependencies to reduce image size
RUN apk del python3 make g++

# Copy built app, server, and entrypoint
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Create data directory (will be overwritten by volume mount, but good for default)
RUN mkdir -p "$DATA_DIR" && chown -R node:node "$DATA_DIR"
VOLUME ["/data"]

EXPOSE 4173

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f "http://127.0.0.1:${PORT}/healthz.txt" || exit 1

# Run as root initially so entrypoint can fix permissions, then drop to node
ENTRYPOINT ["./docker-entrypoint.sh"]
