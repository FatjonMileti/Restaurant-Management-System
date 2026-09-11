# Deployment with Caddy (HTTPS)

Caddy is the single public entrypoint for this app and handles HTTPS
automatically — it fetches and renews the Let's Encrypt certificate itself.
The config lives in the root `Caddyfile`:

- `/graphql*`, `/events*` (SSE, unbuffered), `/api-docs*` → backend
  (`{$BACKEND_UPSTREAM:localhost:5000}`)
- `/*` → frontend `build/` output mounted at `/srv/frontend` (SPA fallback to
  `index.html`)

## Prerequisites

- A domain (e.g. `restaurant.example.com`) with a DNS `A` record pointing to
  your server's public IP.
- Ports **80 and 443** open on the firewall — port 80 is required for the
  certificate challenge.

## Steps

```bash
# 1. Build the frontend with same-origin API URLs
cd frontend && REACT_APP_GRAPHQL_URL=/graphql REACT_APP_WS_URL= npm run build

# 2. Put the build where Caddy expects it
sudo mkdir -p /srv/frontend && sudo cp -r build/* /srv/frontend/

# 3. Start the backend (from backend/, with JWT_SECRET set)
npm run build && npm start

# 4. Start Caddy with your domain (needs privilege for ports 80/443)
DOMAIN=restaurant.example.com BACKEND_UPSTREAM=localhost:5000 \
  sudo caddy run --config Caddyfile --adapter caddyfile
```

Then open **`https://restaurant.example.com`** — plain `http://` redirects to
HTTPS automatically.

## Notes

- Verify DNS first: `dig +short restaurant.example.com` must return your
  server IP, otherwise certificate issuance fails.
- `localhost` won't give you a browser-trusted certificate. For local HTTPS
  testing only, run with `DOMAIN=localhost` plus `sudo caddy trust` to install
  Caddy's local root CA; otherwise expect a browser warning.
- Docker: use `BACKEND_UPSTREAM=backend:5000` and mount `./frontend/build` to
  `/srv/frontend` (see comments in the `Caddyfile`).
- After any `Caddyfile` edit:
  `caddy validate --config Caddyfile --adapter caddyfile`, then
  `sudo caddy reload --config Caddyfile --adapter caddyfile`.
