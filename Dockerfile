# syntax=docker/dockerfile:1

# --- deps: install once, cached across builds as long as lockfiles don't change ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# --- builder: generate the Prisma client and produce the standalone Next.js build ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- runner: only the traced standalone output + static assets, nothing else ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Migrations are a separate deploy step (`npx prisma migrate deploy`), never
# run implicitly here — running them from inside the app container on every
# boot risks a crash-looping container racing itself against the same DB.
CMD ["node", "server.js"]
