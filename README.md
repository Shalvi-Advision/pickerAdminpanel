# Picker Admin Panel

Web admin panel for Retail Magic owners to manage the Shalvi Picker app.

**Stack:** React 18 + Vite + React Router + Axios + Tailwind (via CDN).

## Roles (RBAC)

The system has 4 roles arranged in a clear hierarchy:

| Role | Where they sign in | Scope |
| --- | --- | --- |
| `super_admin` | **Web admin panel only** (this app) | Retail Magic owner — sits above everyone, sees every store. |
| `admin` | Mobile app | Top of the in-store hierarchy. Sees orders escalated by managers across all stores. |
| `manager` | Mobile app | Per-store manager. Reassigns orders, raises escalations. |
| `picker` | Mobile app | Picks order items in the warehouse. |

**Login enforcement:**
- This panel sends `client: "admin_panel"` on login. The backend rejects anyone who isn't `super_admin`.
- The mobile app (no `client` flag) rejects `super_admin`. They must use this panel.

The panel can add/edit/delete users of all 4 roles, but in practice you'll mostly be creating `admin / manager / picker` accounts for the mobile app.

## Features

- **Dashboard** — total users, total orders, sent-to-super-admin KPIs, stores covered.
- **Users** — list / search / filter by role + store; add user with role + store codes + password; edit, deactivate, delete; can't delete yourself.
- **Orders** — every order across every store, filter by status / store / sent-flag, drill into items.
- **Order detail** — per-item picker status (picked / not available / expired / damaged) + remarks. (Item view requires the order to have been sent to super admin.)

## Setup

### 1. Migrate existing roles (one-time)

Old role names existed before this RBAC split (`store_manager`, `super_admin` on mobile). Run the migration once to rename them in MongoDB:

```bash
cd ../picker_app_backend
node migrate-roles.js
```

This will:
- Rename every `store_manager` → `manager`.
- Rename every `super_admin` → `admin`, *except* the Retail Magic owner (`superadmin@patelrmart.com`) who stays as `super_admin`.
- It's idempotent; running it twice is a no-op.

### 2. Make sure the super admin user exists

```bash
node seed-super-admin.js
```

Default credentials:

- email: `superadmin@patelrmart.com`
- password: `Admin@123`

### 3. Restart the backend

The new super-admin endpoints (users CRUD, all-orders, stores list) live in `picker_app_backend/src/controllers/superAdminController.js` and `picker_app_backend/src/routes/superAdmin.routes.js`. Restart the API so they're picked up:

```bash
cd ../picker_app_backend
npm start
```

### 4. Run the admin panel

```bash
npm install      # first time only
npm run dev      # http://localhost:5173
```

The API base URL is read from `.env`:

```
VITE_API_BASE=/api
```

For a production build:

```bash
npm run build    # outputs ./dist (static — serve via any host)
npm run preview  # preview the build locally
```

## New backend endpoints (for reference)

All require `Bearer` JWT of a `super_admin`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/super-admin/dashboard` | KPIs (existing) |
| GET | `/api/super-admin/all-orders?status=&store_code=&sent=` | Every order |
| GET | `/api/super-admin/orders/:id/items` | Items + picker status (existing) |
| GET | `/api/super-admin/stores` | Distinct store codes |
| GET | `/api/super-admin/users?role=&store_code=&q=` | List users |
| POST | `/api/super-admin/users` | Create picker / manager / admin |
| PATCH | `/api/super-admin/users/:id` | Update fields, role, password |
| DELETE | `/api/super-admin/users/:id` | Delete user |

## Notes

- Tailwind is loaded via CDN (`<script src="cdn.tailwindcss.com">`) to keep the project dependency-light. For a fully offline production build, swap to the PostCSS plugin.
- Tokens are stored in `localStorage` (`admin_token`, `admin_user`). The Axios interceptor adds `Authorization: Bearer …` automatically and redirects to `/login` on any 401.
