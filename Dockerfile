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

# Optional volume for any future runtime data; safe default for Unraid appdata.
ENV DATA_DIR=/data
RUN mkdir -p "$DATA_DIR" && chown -R node:node "$DATA_DIR"
VOLUME ["/data"]

ENV NODE_ENV=production
ENV PORT=4173
ENV HOST=0.0.0.0

# Install a tiny static server and curl for the healthcheck.
RUN npm install -g serve@14.2.1 && apk add --no-cache curl

COPY --from=builder /app/dist ./dist

USER node
EXPOSE 4173

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f "http://127.0.0.1:${PORT}/healthz.txt" || exit 1

CMD ["sh", "-c", "serve -s /app/dist -l tcp://${HOST}:${PORT}"]
