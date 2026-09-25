# syntax=docker/dockerfile:1

# ---- Builder: compile the CRA production bundle (same-origin for Caddy) ----
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Defaults target the Caddy single-entrypoint setup (see root Caddyfile):
# same-origin /graphql + /events, so no CORS issues. Override at build time
# only if the frontend is served from a different origin than the backend.
ARG REACT_APP_GRAPHQL_URL=/graphql
ARG REACT_APP_WS_URL=
ARG REACT_APP_API_URL=

COPY frontend/package*.json ./
COPY frontend/.npmrc ./
RUN npm ci
# NOTE: frontend/.env is excluded via the root .dockerignore so a local dev
# .env (e.g. LAN IPs) can never leak into the production bundle. The ARGs
# above (already in the environment) take precedence for CRA at build time.
COPY frontend/ ./
RUN npm run build

# ---- Runner: Caddy serves the static bundle and reverse-proxies /graphql,
# /events, /api-docs and /images to the backend (root Caddyfile). ----
FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/build /srv/frontend
RUN caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

ENV BACKEND_UPSTREAM=backend:5000

EXPOSE 80 443
