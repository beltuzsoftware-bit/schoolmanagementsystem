# Multi-stage production Dockerfile for KuMMi School System
# Optimized for standalone deployment and secure unprivileged execution.

# 1. Base Stage: Environment setup
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# 2. Dependencies Stage: Clean installation of packages
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# 3. Builder Stage: Compile the standalone production bundle
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npx prisma generate
RUN npm run build
RUN npm run postbuild

# 4. Runner Stage: Lightweight runtime image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create unprivileged system user for runtime security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy compiled standalone server and static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/data.json ./data.json

# Grant write ownership to unprivileged nextjs runner for mock database file write access
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start the Next.js standalone production server
CMD ["node", "server.js"]
