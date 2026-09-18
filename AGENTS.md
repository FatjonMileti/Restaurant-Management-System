# AGENTS.md

Two packages under one root: `backend/` and `frontend/`. Always `cd` into the subdirectory before running npm commands.

## Backend (Express + RxDB + TS)

- `tsconfig` uses `moduleResolution: "node16"` — all relative imports **must use `.js`** (e.g. `from './config/db.js'`). Dev uses `tsx` (not ts-node) for this reason.
- Commands: `npm run dev` (`nodemon --exec tsx server.ts`), `npm run build` (`tsc` → `dist/`), `npm start` (`node dist/server.js`), `npm run seed` (`tsx seeds.ts`).
- Data: RxDB v17 + `@basepurpose/rxdb-sqlite` (`better-sqlite3`). Access via `getDB()` (`config/rxdb.ts`). Collections: `users`, `menuItems`, `categories`, `orders`, `reservations`, `settings`. `server.ts` awaits `connectDB()` before `listen()`; `getDB()` throws otherwise.
- RxDB quirks: `findOne()` only reliable for `_id` — else `find().exec()` + JS `.find()/.filter()`; no `$in` (use JS filter); `doc.update()` doesn't refresh — re-fetch before returning; explicit `_id` via `crypto.randomUUID()`; plugins `RxDBQueryBuilderPlugin` + `RxDBUpdatePlugin`; formatters use `unwrapDoc()` (`toJSON()` first); schema change → bump `version` + add `migrationStrategies` entry (even identity) or existing SQLite files throw.
- No `populate()` (broken on this adapter — empties docs). `orders.user` / `reservations.user` keep `ref: 'users'` as documentation only; formatters resolve raw ids via `findOne`. No `categories` ref (`menuItem.category` is a name) and no `items[].menuItem` ref — order items (`menuItem` = string ID) resolve via `buildMenuItemMap()`.
- Auth (`middleware/auth.ts`, type via `types/express.d.ts`): `protect` (JWT Bearer → `req.user`), `admin` (`role==='admin'`), `staff` (`admin`/`staff`).
- Env: `backend/.env` gitignored; copy `.env.example`, fill `JWT_SECRET`. Never commit secrets or log JWTs/passwords.

## API: GraphQL only

- Endpoint `/graphql` (`backend/graphql/schema.ts`, `express-graphql`); REST removed. Helpers in `schema.ts`: `formatUser`, `formatRestaurantSettings`, `getOrCreateRestaurantSettings`, `requireAuth`/`requireAdmin`.
- Frontend: docs in `frontend/src/graphql/queries.ts`, typed hooks in `frontend/src/api/queries.ts` (`graphql-request` + `useAuthStore` token). `GET_*` → `useQuery`, mutations → `useMutation` + `invalidateQueries`. Must resolve endpoint via `resolveGraphQLEndpoint()` (v7 `new URL()` has no base).
- Errors: backend `AppError` codes (`backend/graphql/errors.ts`: `UNAUTHENTICATED`/`FORBIDDEN`/`VALIDATION_FAILED`/`NOT_FOUND`/`CONFLICT` via `extensions.code`); frontend uses only `getGraphQLErrorMessage(err, fallback)` (`utils/graphqlErrors.ts`). Never duplicate it.

## Real-time (SSE, not socket.io)

- `GET /events` (`backend/sse.ts`: `initSSE(app)`, `emitEvent(event, data)`). Mutations emit `emitEvent('<entity>:changed', { <entity>: formatted })`; deletes emit `{ <entity>: { id, deleted: true } }`.
- Frontend: `getEventSource()` (`src/eventSource.ts`) + `useEventSource()` (`src/hooks/useEventSource.ts`) patches React Query cache (normalize via `mapId`/`mapUserRef` from `src/api/queries.ts`; upsert-new-at-top / merge / remove on `deleted:true`), else `invalidateQueries`. `tables:changed` has no entity — always invalidate; deletes emit no `tables:changed`, so frontend invalidates `['tables']` when a removed payload held `tableNumber`.

## Frontend (CRA 5 + TS)

- `proxy` → `http://localhost:5000`. `npm start` (dev), `npm run build` (→ `build/`).
- State: `zustand` (`authStore`, `cartStore`; `useAuth()` persists `user`+`token` in `localStorage`), `react-hook-form`, `@tanstack/react-query`. `App.tsx` global `LoadingSpinner` via `useIsFetching`/`useIsMutating`.
- Layout: `src/pages/` routes, `src/components/pages/` sections (MenuItemCard/Form/Header, OrderForm/List, ReservationForm/List, User/Category/RestaurantSection, Login/RegisterForm). Reuse `SectionCard`, `FilterBar`, `StatusBadge`, `ConfirmDialog`, `LoadingSpinner`, `ActionRow`, `TableSelect` (always for table numbers, never raw inputs). Small typed props; prefer editing existing files.
- Data rules: invalidate `['tables']` after order/reservation mutations, `['restaurantSettings']` after settings update. Debounce free-text search inputs with `use-debounce` (500ms) so each keystroke doesn't fire a query.

## Auth, roles, domain rules

- Seeds (`*123`): `admin@restaurant.com` / `staff@restaurant.com` / `john@example.com`.
- Gates (enforce frontend hiding **and** backend `requireAdmin`): Menu add/edit → `admin`; Settings → `admin`; Tables (`/tables`) → `staff`/`admin`; `authUsers` list → `staff`/`admin` read-only (user mutations stay `admin`-only, passwords never returned); Orders/Reservations filters + status changes respect role.
- Categories from admin `/settings` (`CategorySection`); no hardcoded enum. Menu edit = click card (fields: `name`, `description`, `price`, `category`, `image`).
- Orders: `pending` editable, `completed`/`cancelled` deletable. Reservations: `confirmed` editable, `completed`/`cancelled` deletable.
- Filtering: Menu by category; Orders/Reservations by status + `TableSelect`.
- Tables: `tables` query computed from busy orders (`pending`/`preparing`) + confirmed reservations; singleton `db.settings.tableCount` (validate `>= 1` server-side) drives all selects. Busy tables labeled but selectable; backend rejects orders with `Table is busy`.
- Defaults: `MenuItem.available=true`, `Reservation.status='confirmed'`.

## Styling

Tailwind `className` on MUI components (e.g. `<Button className="!bg-[#e94560]...">`); `sx` only for what Tailwind can't do. Patterns in `frontend/src/index.css` `@layer components`: `section-card`, `card`/`card-grid`, `form-panel`/`form-input-sm`/`form-label`, `table-card`, `filter-bar`, `nav-link`, `spinner`/`loading-wrapper`, `page-heading`/`section-heading`, `btn-primary`/`btn-secondary`/`btn-danger`/`btn-blue-sm`, `error-text`. No inline `style=` or new CSS files.

## Images + Caddy

- Images: backend `GET /images/*` from `backend/public/images`. Store bare filenames, `/images/<file>`, or absolute URLs — never hardcode host. Frontend `useCachedImage(src, fallback, updatedAt)` (`src/hooks/useCachedImage.ts`) caches backend images in `localStorage` (`rms-img:`) as data URLs — use for all menu images + logo, never raw `src`. Base via `getImageApiBase()` (`REACT_APP_API_URL`; empty = same-origin via proxy/Caddy). Cache keyed by `updatedAt` (queried; in SSE payloads via formatters) — edits bump it and evict stale keys. Sanitize on render (`onError` hide).
- Caddy v2 (single entrypoint): `/graphql*`, `/events*` (`flush_interval -1`), `/api-docs*`, `/images*` → `{$BACKEND_UPSTREAM:localhost:5000}`; `/*` → `frontend/build` at `/srv/frontend` + SPA fallback. Same-origin build: `REACT_APP_GRAPHQL_URL=/graphql REACT_APP_WS_URL= npm run build` (empty `WS_URL` → `/events`). After edits: `caddy fmt` + `caddy validate --config Caddyfile --adapter caddyfile` (use `caddy:2` image if no binary).

## Quality & workflow

- Strict TS; `npm run build` in both packages must pass. Format with prettier (`.prettierrc`/`.editorconfig`) before commit. Tests required with every feature/fix/refactor and `build` + `test` must pass: backend Jest+ts-jest (`backend/tests/`, `npm test`); frontend Testing Library via react-scripts (`src/**/__tests__/`, `npm test`). No CI — don't add Actions unless asked.
- Commits: imperative (`feat:`/`fix:`/`style:`), stage only intended files (`git status`/`diff --cached`), push only on request.
- Agent: read files fully before editing; one `in_progress` todo at a time (verify before completing); preserve user corrections/constraints; never overwrite user edits — reconcile instead; update this file when a new convention/workflow is established.
