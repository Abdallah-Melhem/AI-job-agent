# ─── Server Dockerfile ───────────────────────────────────────────────────────
# Multi-stage build: only production deps land in the final image

FROM node:20-alpine AS base
WORKDIR /app

# ── Stage 1: install production dependencies ──────────────────────────────
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ── Stage 2: final runtime image ───────────────────────────────────────────
FROM base AS runner

# Create non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

WORKDIR /app

# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy server source
COPY . .

# Create uploads directory with correct permissions
RUN mkdir -p uploads/tailored && chown -R appuser:appgroup /app

USER appuser

# Internal port (not exposed to the internet directly — nginx/proxy handles that)
EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "server.js"]
