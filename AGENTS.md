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

- `frontend/src/components/pages/` — split page components (MenuItemCard, MenuItemForm, MenuHeader, OrderForm, OrderList, ReservationForm, ReservationList, UserSection, CategorySection, LoginForm, RegisterForm)
- Reusable UI: `FilterBar`, `StatusBadge`, `SectionCard`, `LoadingSpinner`, `ActionRow`
- MUI (`@mui/material`) used across Navbar, forms, pages, cards — styled via Tailwind `className`
- `frontend/src/App.tsx` mounts global `LoadingSpinner` using `useIsFetching` + `useIsMutating`

- Categories managed from admin `/settings` page (`CategorySection`) via `/api/categories`
- Dynamic categories: MenuItem `category` references DB categories (no hardcoded enum)
- Menu item edit: click card opens edit form with DB default data (`name`, `description`, `price`, `category`, `image`)
- Order edit: pending orders editable (`PUT /api/orders/:id`); completed/cancelled deletable (`DELETE /api/orders/:id`)
- Reservation edit/delete: confirmed editable (`PUT /api/reservations/:id`); completed/cancelled deletable (`DELETE /api/reservations/:id`)

- Filtering: Menu (category dropdown), Orders (status + table inputs), Reservations (status + table inputs)
- `.prettierrc` and `.editorconfig` at root; `prettier` installed (`npm install prettier`); `npm run format`

- No test framework or test files exist
- No CI/CD workflows
