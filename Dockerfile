# ── Stage 1: Instalar dependencias ───────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# ── Stage 3: Runner (producción) ──────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public         ./public
COPY --from=builder /app/.next          ./.next
COPY --from=builder /app/node_modules   ./node_modules
COPY --from=builder /app/package.json   ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/prisma         ./prisma

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
