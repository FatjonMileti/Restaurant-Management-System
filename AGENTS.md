# AGENTS.md

## Repo structure

Two independent packages under one root: `backend/` and `frontend/`. Always `cd` into the subdirectory before running package commands.

## Backend (Express + Mongoose + TypeScript)

**Important TS quirk:** `tsconfig.json` uses `moduleResolution: "node16"`. All relative imports in `.ts` files **must use `.js` extension** (e.g. `from './config/db.js'`). This is required for `tsc` to compile correctly.

| Command | What it does |
|---|---|
| `npm run dev` | `nodemon --exec tsx server.ts` — uses **tsx** (not ts-node) because tsx handles `.js` extensions for `.ts` files correctly |
| `npm run build` | `tsc` — compiles to `dist/` |
| `npm start` | `node dist/server.js` — runs compiled output |
| `npm run seed` | `tsx seeds.ts` — populates DB with sample data |

**Auth middleware** (`middleware/auth.ts`):
- `protect` — requires valid JWT `Bearer` token, attaches `req.user`
- `admin` — requires `req.user.role === 'admin'`
- `staff` — requires role `admin` or `staff`
- `req.user` type is augmented globally via `types/express.d.ts`

**Env:** `backend/.env` is gitignored. Copy `backend/.env.example` and fill in `MONGO_URI` and `JWT_SECRET`.

## Frontend (Create React App + TypeScript)

CRA 5 with TypeScript — no custom webpack. `proxy` in `package.json` forwards API requests to `http://localhost:5000`.

| Command | What it does |
|---|---|
| `npm start` | CRA dev server |
| `npm run build` | Production build to `build/` |

## API entrypoints

All routes are mounted in `server.ts`:
- `/api/auth` → `routes/auth.ts`
- `/api/menu` → `routes/menu.ts`
- `/api/orders` → `routes/orders.ts`
- `/api/reservations` → `routes/reservations.ts`
- `/api/categories` → `routes/category.ts`

## Seeded credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@restaurant.com | admin123 |
| Staff | staff@restaurant.com | staff123 |
| Customer | john@example.com | customer123 |

- `frontend/src/components/pages/` — split page components (MenuItemCard, MenuItemForm, MenuHeader, OrderForm, OrderList, ReservationForm, ReservationList, UserSection, CategorySection, RestaurantSection, LoginForm, RegisterForm)
- Reusable UI: `FilterBar`, `StatusBadge`, `SectionCard`, `LoadingSpinner`, `ActionRow`, `TableSelect`
- MUI (`@mui/material`) used across Navbar, forms, pages, cards — styled via Tailwind `className`
- `frontend/src/App.tsx` mounts global `LoadingSpinner` using `useIsFetching` + `useIsMutating`

## Styling

- **Use Tailwind CSS for styling MUI components** — prefer `className` with Tailwind utilities over `sx` or custom CSS (e.g. `<Button className="!bg-[#e94560] hover:!bg-[#d63d54]">` instead of `sx={{ bgcolor: ... }}`). Only use `sx` for MUI-specific layout props that Tailwind cannot handle.
- Tailwind config is at root (`tailwind.config.js`, `postcss.config.js`); utility classes are defined in `frontend/src/index.css` (`@layer components`).
- Keep styling consistent with existing patterns: `section-card`, `card`/`card-grid`, `form-panel`/`form-input-sm`/`form-label`, `table-card`, `filter-bar`, `nav-link`, `spinner`/`loading-wrapper`, `page-heading`/`section-heading`, `btn-primary`/`btn-secondary`/`btn-danger`/`btn-blue-sm`, `error-text`.
- Never add inline `style=` or new CSS files — extend `@layer components` in `frontend/src/index.css`.

## API / GraphQL

- Active API is **GraphQL** at `/graphql` (`backend/graphql/schema.ts`, `express-graphql`). REST routes in `backend/routes/*` are currently commented out in `server.ts:26`.
- Frontend GraphQL documents live in `frontend/src/graphql/queries.ts`; typed hooks in `frontend/src/api/queries.ts` (uses `graphql-request` + `useAuthStore` token header). `GET_*` → `useQuery`, mutations → `useMutation` with `qc.invalidateQueries`.
- Schema helpers: `formatUser`, `formatRestaurantSettings`, `getOrCreateRestaurantSettings`, `requireAuth` / `requireAdmin` in `schema.ts:141`.
- Restaurant settings: `RestaurantSettings` model (`backend/models/RestaurantSettings.ts`) — singleton, `tableCount` drives `TableSelect` and `tables` query.
- Tables: `tables: [TableStatus!]!` computed from busy orders (`pending`/`preparing`) and confirmed reservations; frontend `/tables` page is staff/admin only.

## Auth & Roles

- `protect` → JWT `Bearer` token → `req.user`; `admin` → `role==='admin'`; `staff` → `admin` or `staff`. Frontend `useAuth()` (`store/authStore.ts:93`) persists `user`+`token` in `localStorage`.
- Role gates: Menu add/edit → `admin` only; Settings → `admin` only; Tables → `staff`/`admin`; Orders/Reservations filters and status changes respect role; verify both frontend hiding **and** backend `requireAdmin` checks.
- Seeded users: `admin@restaurant.com`, `staff@restaurant.com`, `john@example.com` (all `*123`).

## Domain Rules

- Categories managed from admin `/settings` (`CategorySection`) via GraphQL; MenuItem `category` references DB categories (no hardcoded enum).
- Menu item edit: click card opens edit form with DB default data (`name`, `description`, `price`, `category`, `image`).
- Order edit: `pending` editable; `completed`/`cancelled` deletable. Reservation edit/delete: `confirmed` editable; `completed`/`cancelled` deletable.
- Filtering: Menu (category dropdown), Orders/Reservations (status + table `TableSelect` dropdown).
- Tables: `tableCount` in restaurant settings determines selectable tables everywhere; busy tables are labeled but selectable — backend returns `Table is busy` error for orders.

## Frontend State & Data

- State: `zustand` (`authStore`, `cartStore`), `react-hook-form` for forms, `@tanstack/react-query` for server state. `App.tsx` global overlay via `useIsFetching`/`useIsMutating`.
- Forms: use `TableSelect` for table numbers (not raw number inputs). Invalidate `['tables']` after order/reservation mutations and `['restaurantSettings']` after settings update.
- Error handling: unwrap `ClientError` → `err.response.errors[0].message`; handle `Failed to fetch`/`NetworkError` as `Network error: backend is unavailable`.

## Code Style & Quality

- TypeScript strict; keep imports with `.js` extension in backend (node16). Run `npm run build` in both `backend/` and `frontend/` before committing — must compile without errors.
- Formatting: `.prettierrc` + `.editorconfig` at root; `prettier` installed — run `npm run format` (or `npx prettier --write .`) before commit.
- No test framework or test files exist — do not add test setup unless requested.
- No CI/CD workflows — do not add GitHub Actions unless requested.

## Component Guidelines

- Prefer editing existing files over creating new ones; create new files only when required (e.g., `TableSelect`, `RestaurantSection`, `Tables`).
- Reuse `SectionCard`, `FilterBar`, `StatusBadge`, `ConfirmDialog`, `LoadingSpinner`, `TableSelect`. Keep props small and typed.
- Keep `frontend/src/components/pages/` for page-specific sections; `frontend/src/pages/` for route pages.

## Git & Workflow

- Two packages under one root — `cd` into subdirectory before running npm commands.
- Do not commit `backend/.env` (gitignored) or secrets; copy from `backend/.env.example`.
- Commit messages: concise, imperative (e.g., `feat:`, `fix:`, `style:`). Stage only intended files; inspect `git status`/`git diff --cached`.
- Push only when explicitly requested.

## Security

- Never log JWT secrets or passwords. Validate `tableCount >= 1` and role checks server-side. Sanitize `logo`/`image` URLs on render (`onError` hide).

## Agent Workflow

- Read relevant files fully before editing; verify with `npm run build` and/or `npm start` where feasible.
- Keep exactly one `in_progress` todo at a time; mark completed only after verification.
- Preserve user corrections and scope constraints across turns until explicitly lifted.
