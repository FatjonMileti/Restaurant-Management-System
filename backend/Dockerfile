# syntax=docker/dockerfile:1

# ---- Builder: install all deps (incl. dev) and compile TypeScript ----
FROM node:22-bookworm-slim AS builder

# better-sqlite3 needs a toolchain when no prebuild matches the platform.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runner: production-only deps, compiled output, persistent SQLite ----
FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production \
  PORT=5000

WORKDIR /app

COPY package*.json ./
# Reuse the builder's node_modules (native bindings already compiled for
# bookworm/glibc) and prune dev dependencies — no toolchain needed here.
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# RxDB (@basepurpose/rxdb-sqlite) creates `restaurant-db.db` in the process
# cwd (/app). Redirect it onto the persistent volume via symlink so `dist/`
# and `node_modules/` in the image layer are never shadowed by the mount.
RUN mkdir -p /data && ln -sf /data/restaurant-db.db /app/restaurant-db.db
VOLUME /data

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||'5000')+'/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
