# syntax=docker/dockerfile:1

# ---- deps ------------------------------------------------------------------
FROM node:22-alpine AS deps
# sharp (image optimisation) needs glibc shims on alpine.
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ---------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# No runtime secrets exist at image-build time; lib/env.ts skips enforcement.
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
RUN npm run build

# ---- migrate / worker ------------------------------------------------------
# Same source, different entrypoint. Keeps one image to build and push.
#
# Deliberately NOT the last stage. A build with no --target builds whatever
# stage comes last, and platforms that build a Dockerfile for you — Coolify,
# Railway, Render — generally do not pass one. With `tools` last, the deployed
# container would quietly run the worker instead of the web server.
FROM node:22-alpine AS tools
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
CMD ["npx", "tsx", "worker/index.ts"]

# ---- runner ----------------------------------------------------------------
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# `output: "standalone"` emits a self-contained server with only the modules
# actually reachable from the build — a fraction of node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
