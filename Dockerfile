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

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++ curl

# Optional volume for persistent data
ENV DATA_DIR=/data
RUN mkdir -p "$DATA_DIR" && chown -R node:node "$DATA_DIR"
VOLUME ["/data"]

ENV NODE_ENV=production
ENV PORT=4173
ENV HOST=0.0.0.0

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev express better-sqlite3

# Copy built app and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js

USER node
EXPOSE 4173

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f "http://127.0.0.1:${PORT}/healthz.txt" || exit 1

CMD ["node", "server.js"]
