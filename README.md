# Restaurant Management System

Full-stack MERN restaurant platform — menu, orders, reservations, tables and admin settings with real-time updates, role-based access and an optimized GraphQL API.

## Features

- **Dashboard** – aggregated stats via `dashboardStats` (orders/reservations by status, revenue, tables occupancy, today counts, recent orders). Single query replaces 3 list fetches.
- **Menu** – CRUD (admin), category filter, `available` flag. Cards are memoized, lazy-loaded images.
- **Orders** – create/edit (pending), status flow `pending → preparing → completed/cancelled`, `completed/cancelled` deletable. Table occupancy check (`Table is busy`), `TableSelect` dropdown.
- **Reservations** – create/edit (`confirmed`), `completed`/`cancelled` deletable, staff status select.
- **Tables** – `tableCount` from `RestaurantSettings` drives `TableSelect` everywhere; `tables` query computes busy from `pending`/`preparing` orders + `confirmed` reservations.
- **Settings (admin)** – Restaurant details (name/logo/address/phone/email/`tableCount`), Users (create/delete/role change), Categories (CRUD). Tabs are lazy-loaded.
- **Real-time** – `socket.io` events (`menu:changed`, `orders:changed`, `reservations:changed`, `categories:changed`, `users:changed`, `settings:changed`, `tables:changed`) auto-invalidate `react-query` caches.

## Tech Stack

- **Frontend:** React 18 (CRA 5 + TypeScript), React Router 6, `@tanstack/react-query` 5, `zustand` (auth/cart), `react-hook-form` + `zod`, `graphql-request` + `@apollo/client` (`gql` docs), `@mui/material` styled with **Tailwind CSS**, `socket.io-client`, Testing Library/Jest
- **Backend:** Node 18+, Express 4, Mongoose 8, TypeScript (`moduleResolution: node16` — imports require `.js` suffix), GraphQL (`graphql` + `express-graphql`, `graphiql: true`), `jsonwebtoken` + `bcryptjs`, `socket.io`, `zod`, `moment`, `swagger-jsdoc`/`swagger-ui-express`
- **Auth:** JWT Bearer (`protect` → `req.user`), `admin`/`staff` guards; frontend `useAuthStore` persists `user+token` in `localStorage`
- **Testing:** Backend Jest + `ts-jest` (ESM), Frontend `react-scripts` Jest + Testing Library

## Project Structure

```
backend/
  config/db.ts                Mongoose connection
  graphql/
    typeDefs.ts               SDL (User, MenuItem, Category, Order, Reservation, RestaurantSettings, TableStatus, DashboardStats, StatusCount)
    helpers/
      formatters.ts           formatUser, formatMenuItem/Category/Order/Reservation/RestaurantSettings, getOrCreateRestaurantSettings
      auth.ts                 requireAuth, requireAdmin, requireStaffOrAdmin
    resolvers/
      auth.ts, menu.ts, order.ts, reservation.ts, category.ts, settings.ts, tables.ts, dashboard.ts
      index.ts                merged root resolvers
    schema.ts                 buildSchema(typeDefs) + root
    validation.ts             Zod schemas + validate()
  models/                     User, MenuItem, Category, Order (indexed), Reservation (indexed), RestaurantSettings
  middleware/auth.ts
  routes/                     REST routers (legacy, commented out in server.ts)
  server.ts                   Express + /graphql + /api-docs + socket init
  socket.ts                   emitEvent / initSocket
  seeds.ts
  tests/                      Jest suites (validation, formatters, auth, typeDefs, resolvers)
  jest.config.cjs
  tsconfig.json               node16

frontend/
  src/
    api/queries.ts            graphql-request + useAuthStore token, mapId/mapArray, use* hooks (staleTime 30-60s, dashboardStats invalidation)
    graphql/queries.ts        gql documents (GET_MENU_ITEMS, GET_DASHBOARD_STATS, etc.)
    store/                    authStore (zustand), cartStore
    validation/schemas.ts     Zod schemas for forms
    hooks/useSocket.ts        invalidates queries on socket events (incl. dashboardStats)
    components/
      PageHeader.tsx          reusable flex justify-between header (replaces repeated className)
      FilterBar.tsx, StatusBadge.tsx, SectionCard.tsx, TableSelect.tsx, LoadingSpinner, etc.
      pages/
        DashboardStatCard.tsx, MenuCategoryFilter.tsx, OrderCard.tsx, ReservationCard.tsx, TableCard.tsx,
        MenuItemCard.tsx (memo + lazy image), MenuItemForm.tsx, OrderForm.tsx, ReservationForm.tsx,
        UserForm.tsx, UserTable.tsx, CategorySection.tsx, RestaurantSection.tsx
    pages/                    Dashboard, Menu, Orders, Reservations, Tables, Settings, Home, Login, Register
    App.tsx                   lazy routes + global useIsFetching/useIsMutating overlay
    setupTests.ts
  tailwind.config.js, postcss.config.js   Tailwind at root, utilities in src/index.css (@layer components)
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Environment

Create `backend/.env` from `backend/.env.example`:

```
MONGO_URI=mongodb://localhost:27017/restaurant
JWT_SECRET=your_jwt_secret
PORT=5000
```

Frontend proxy is `http://localhost:5000` (`frontend/package.json:proxy`) or set `REACT_APP_GRAPHQL_URL=http://localhost:5000/graphql`.

### Install & Run

```bash
# Backend
cd backend
npm install --legacy-peer-deps
npm run seed        # seed sample data
npm run dev         # tsx + nodemon (handles .js extensions)

# Frontend
cd frontend
npm install --legacy-peer-deps
npm start           # CRA dev server
# open http://localhost:3000  (GraphiQL at http://localhost:5000/graphql)
```

### Build

```bash
cd backend && npm run build     # tsc -> dist/
npm start                        # node dist/server.js

cd frontend && npm run build    # build/
```

### Testing

```bash
# Backend — 11 suites, 73 tests
cd backend && npm test                 # jest --runInBand
npm run test:coverage

# Frontend — 13 suites, ~73 tests
cd frontend && npm test                # react-scripts test --watchAll=false
npm run test:coverage
```

## Seed Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@restaurant.com | admin123 |
| Staff | staff@restaurant.com | staff123 |
| Customer | john@example.com | customer123 |
| Customer | jane@example.com | customer123 |
| Customer | bob@example.com | customer123 |

## API

Active API is **GraphQL** at `POST /graphql` (`backend/graphql/*`, `express-graphql`). REST routers in `backend/routes/*` are currently commented out in `server.ts`.

- **Swagger:** `GET /api-docs` (REST docs, legacy)
- **GraphiQL:** enabled at `/graphql` when `graphiql: true`

### Key Queries / Mutations

```graphql
query GetDashboardStats {
  dashboardStats {
    totalOrders pendingOrders completedOrders totalRevenue
    totalReservations confirmedReservations
    totalMenuItems availableMenuItems totalUsers totalCategories
    totalTables busyTables freeTables todayOrders todayReservations
    recentOrders { id totalAmount status }
    ordersByStatus { status count }
  }
}
query GetMenuItems($category: String) { menuItems(category: $category) { id name price category } }
mutation CreateOrder($items: [OrderItemInput!]!, $tableNumber: Int) { createOrder(items: $items, tableNumber: $tableNumber) { id totalAmount } }
```

All `graphql-request` calls in `frontend/src/api/queries.ts` attach `Authorization: Bearer <token>` from `useAuthStore`.

## Auth & Roles

- `protect` → JWT → `req.user`; `admin` → `role==='admin'`; `staff` → `admin|staff`.
- Frontend `useAuth()` + `ProtectedRoute`; backend `requireAuth`/`requireAdmin` checks.
- Gates: Menu add/edit → admin; Settings → admin; Tables → staff/admin; Orders/Reservations filters & status changes respect role.

## Domain Rules

- Categories via DB (`/settings` → `CategorySection`), `MenuItem.category` refs DB (no enum).
- Menu edit: click card → form with DB defaults.
- Order: `pending` editable; `completed`/`cancelled` deletable. Reservation: `confirmed` editable; `completed`/`cancelled` deletable.
- `tableCount` in `RestaurantSettings` drives `TableSelect`; busy tables are labeled but selectable → backend error `Table is busy`.

## Styling

- Use **Tailwind** `className` for MUI components (`<Button className="!bg-[#e94560]">`) — avoid `sx` except for MUI layout props.
- Utilities in `frontend/src/index.css` `@layer components`: `section-card`, `card`, `form-panel`/`form-input-sm`, `table-card`, `filter-bar`, `page-heading`, `btn-*`, `spinner`, etc. Never use inline `style=` or new CSS files.

## Notes

- **TypeScript quirk:** `backend/tsconfig.json` is `node16` → relative imports must use `.js` (e.g. `from './config/db.js'`). Run via `tsx` in dev (`npm run dev`), `tsc` in build.
- **Optimization:** lean queries + indexes (`Order.status+tableNumber`, `Reservation.status+tableNumber+date`, `MenuItem.category+available`), `Promise.all` in `dashboardStats`, `staleTime`/`gcTime` in react-query, `React.memo`/`useMemo`/`useCallback`, lazy images/tabs, `dashboardStats` invalidated on all relevant mutations/socket events.
- **Recent refactor:** `PageHeader` (`flex justify-between items-center mb-2`) extracted; `backend/graphql/schema.ts:674` split into `typeDefs` + `helpers` + 8 resolver modules; frontend `OrderList`/`ReservationList`/`UserSection`/`Tables` split into `OrderCard`/`ReservationCard`/`UserTable`/`TableCard` etc.
