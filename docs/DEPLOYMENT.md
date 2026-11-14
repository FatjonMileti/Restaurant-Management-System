# Deployment with Caddy (HTTPS)

Caddy is the single public entrypoint for this app and handles HTTPS
automatically — it fetches and renews the Let's Encrypt certificate itself.
The config lives in the root `Caddyfile`:

- `/graphql*`, `/events*` (SSE, unbuffered), `/api/ai*` (virtual waitress) and
  `/api-docs*` → backend (`{$BACKEND_UPSTREAM:localhost:5000}`)
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

# 3. Start the backend (from backend/, with JWT_SECRET set; add AI_* vars if enabled)
npm run build && npm start

# 4. Start Caddy with your domain (needs privilege for ports 80/443)
DOMAIN=restaurant.example.com BACKEND_UPSTREAM=localhost:5000 \
  sudo caddy run --config Caddyfile --adapter caddyfile
```

Then open **`https://restaurant.example.com`** — plain `http://` redirects to
HTTPS automatically.

## AI virtual waitress (optional)

The assistant stays off unless `AI_ENABLED=true`. Configure the backend
environment before starting it:

```bash
AI_ENABLED=true
AI_LLM_BASE_URL=https://api.openai.com/v1   # or http://localhost:11434/v1
AI_LLM_API_KEY=...                          # optional for local Ollama
AI_LLM_MODEL=gpt-4o-mini                    # or e.g. llama3.1
AI_EMBEDDING_MODEL=text-embedding-3-small   # required for RAG
AI_RESTAURANT_TIMEZONE=Europe/Rome          # IANA zone used for dates/times
```

Provider keys remain on the server. Do not add them to the frontend build.
`/api/ai*` is already proxied by the `Caddyfile`; no extra Caddy rule is needed.
If the AI config is invalid, startup logs an error but the existing GraphQL
site keeps running.

After deploying the backend, ingest approved knowledge (requires an embedding
provider):

```bash
cd backend
npm run ai:ingest
```

Alternatively set `AI_AUTO_SEED_KNOWLEDGE=true` to seed `backend/knowledge/`
on first startup. The Docker image copies that directory; persist the SQLite
volume so conversations, drafts and knowledge chunks survive restarts.

### Multilingual waiter interpreter

The staff-facing `/interpreter` page reuses the AI gate but can use a separate
translation endpoint. It is disabled unless `AI_ENABLED=true` and a translation
base URL + model resolve; translation calls are made without tools and cannot
create orders or reservations.

```bash
AI_INTERPRETER_ENABLED=true                    # set false to remove the page
AI_TRANSLATION_BASE_URL=https://api.openai.com/v1   # defaults to AI_LLM_BASE_URL
AI_TRANSLATION_API_KEY=...                     # defaults to AI_LLM_API_KEY
AI_TRANSLATION_MODEL=gpt-4o-mini               # defaults to AI_LLM_MODEL
AI_TRANSLATION_MAX_INPUT_CHARS=2000
AI_INTERPRETER_RATE_LIMIT_MAX=30               # per AI_RATE_LIMIT_WINDOW_MS/IP
```

Only `staff`/`admin` tokens can call `POST /api/ai/interpreter/translate`;
`GET /api/ai/interpreter/languages` is public but returns no credentials.
Translations are not persisted, so no extra volume or migration is needed.
The language registry is curated by the app and does not guarantee provider
coverage for every pair. After deployment, sign in as staff, open
`/interpreter`, translate a greeting both ways and verify that an allergy/price
sentence raises the human-verification warning. Full behavior, privacy notes and
manual checks are in the [README](../README.md#multilingual-waiter-interpreter-optional).

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
