# syntax=docker/dockerfile:1

# --- dependencies ----------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build -----------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- run -------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    SOLANDA_DATA_DIR=/data

# Run as a non-root user, and give it ownership of the register directory.
RUN addgroup -g 1001 -S nodejs \
 && adduser -S -u 1001 -G nodejs solanda \
 && mkdir -p /data \
 && chown -R solanda:nodejs /data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=solanda:nodejs /app/.next/standalone ./
COPY --from=builder --chown=solanda:nodejs /app/.next/static ./.next/static

USER solanda
EXPOSE 3000

# The register lives here. Mount a volume or the land resets on every deploy.
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/stats').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
