# syntax=docker/dockerfile:1

# ---- deps: install dependencies only (cached layer) ----
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# ---- builder: build the Next.js app ----
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runner: minimal runtime image ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Cloud Run injects PORT; Next.js standalone server respects it.
ENV PORT=8080

# Standalone output copies only what's needed to run (no full node_modules)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 8080
CMD ["node", "server.js"]
