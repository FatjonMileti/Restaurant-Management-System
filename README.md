# Restaurant Management System

Full-stack MERN application for managing restaurant menu, orders, and reservations.

## Tech Stack

- **Frontend:** React 18, React Router 6, Axios, TypeScript
- **Backend:** Node.js, Express, MongoDB (Mongoose), TypeScript
- **Auth:** JWT with bcrypt password hashing

## Project Structure

```
backend/              Express API server
  config/             Database connection
  controllers/        Route handlers
  middleware/         Auth middleware (protect, admin, staff)
  models/             Mongoose schemas (User, MenuItem, Order, Reservation)
  routes/             Express routers
  types/              TypeScript declarations
  server.ts           Entry point
  seeds.ts            Database seeder

frontend/             React SPA
  src/
    api/              Axios instance with JWT interceptor
    components/       Navbar, ProtectedRoute
    context/          AuthContext (login, register, logout)
    pages/            Home, Login, Register, Dashboard, Menu,
                      Orders, Reservations, Admin
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance (local or Atlas)

### Environment Variables

Create `backend/.env`:

```
MONGO_URI=mongodb://localhost:27017/restaurant
JWT_SECRET=your_jwt_secret
PORT=5000
```

### Install & Run

```bash
# Backend
cd backend
npm install
npm run seed       # Seed database with sample data
npm run dev        # Start dev server with hot reload

# Frontend
cd frontend
npm install
npm start          # Start CRA dev server (proxied to :5000)
```

### Build for Production

```bash
cd backend && npm run build     # Compiles TS to dist/
cd frontend && npm run build    # Creates optimized build/
```

## Seed Credentials

| Role     | Email                  | Password     |
|----------|------------------------|--------------|
| Admin    | admin@restaurant.com   | admin123     |
| Staff    | staff@restaurant.com   | staff123     |
| Customer | john@example.com       | customer123  |
| Customer | jane@example.com       | customer123  |
| Customer | bob@example.com        | customer123  |

## API Endpoints

| Endpoint                     | Method | Auth   | Description            |
|------------------------------|--------|--------|------------------------|
| `/api/auth/register`         | POST   | —      | Register new user      |
| `/api/auth/login`            | POST   | —      | Login                  |
| `/api/auth/profile`          | GET    | User   | Get profile            |
| `/api/auth/users`            | GET    | Admin  | List all users         |
| `/api/auth/users`            | POST   | Admin  | Create user            |
| `/api/auth/users/:id`        | DELETE | Admin  | Delete user            |
| `/api/auth/users/:id/role`   | PATCH  | Admin  | Update user role       |
| `/api/menu`                  | GET    | —      | List menu items        |
| `/api/menu/:id`              | GET    | —      | Get menu item          |
| `/api/menu`                  | POST   | Admin  | Create menu item       |
| `/api/menu/:id`              | PUT    | Admin  | Update menu item       |
| `/api/menu/:id`              | DELETE | Admin  | Delete menu item       |
| `/api/orders`                | GET    | User   | List orders            |
| `/api/orders/:id`            | GET    | User   | Get order              |
| `/api/orders`                | POST   | User   | Create order           |
| `/api/orders/:id/status`     | PUT    | Staff  | Update order status    |
| `/api/reservations`          | GET    | User   | List reservations      |
| `/api/reservations/:id`      | GET    | User   | Get reservation        |
| `/api/reservations`          | POST   | User   | Create reservation     |
| `/api/reservations/:id`      | PUT    | Admin  | Update reservation     |
| `/api/reservations/:id/cancel` | PUT  | User   | Cancel reservation     |
