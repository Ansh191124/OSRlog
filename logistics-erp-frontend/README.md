# OSR Logistics — Logistics ERP Frontend

A React + Vite + Tailwind frontend built against the Logistics ERP backend API
(Node/Express/MongoDB), covering every module: Auth, Dashboard, Trip Sheets (with
leg entries, expense box, summary box), Drivers, Vehicles, Maintenance and Payments.

## 1. Setup

```bash
npm install
cp .env.example .env
# edit .env if your backend isn't on http://localhost:5000
npm run dev
```

The app runs at `http://localhost:5173` and expects the backend at the URL in
`VITE_API_BASE_URL` (default `http://localhost:5000/api`).

Sign in with the seeded admin: `admin@logistics.com` / `Admin@123` (or whatever you
set when you ran the backend's `npm run seed`).

## 2. Build for production

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally
```

Deploy `dist/` to any static host (S3 + CloudFront, Vercel, Netlify, Nginx, etc.) and
point `VITE_API_BASE_URL` at your deployed API.

## 3. What's included

| Area | Screens |
|---|---|
| **Auth** | Login, JWT stored in `localStorage`, auto-redirect to `/login` on 401 |
| **Dashboard** | Today/all-time stat cards, cash vs online totals, maintenance-pending count, P/L trend chart (daily/weekly/monthly/yearly), vehicle performance chart |
| **Trip Sheets** | List with search + pagination; full digital sheet per trip — header, editable leg entries table (add/edit/delete rows inline), expense box, summary box, and a "Suggest from entries" button wired to `POST /trips/:id/calculate` |
| **Drivers** | List, search, create/edit modal, delete (admin only) |
| **Vehicles** | List, search, create/edit modal, delete (admin only), expiring-documents banner (RC/insurance/permit/fitness/PUC) |
| **Maintenance** | Status board (pending/upcoming/ongoing/completed) sourced from `/maintenance/alerts`, filterable list, create/edit modal |
| **Payments** | Cash vs online summary cards, type filter, list, log-payment modal |
| **User access** | Admin-only staff-user creation and least-privilege roles |

Role-based UI: delete actions and user creation are gated to `role === 'admin'`,
matching the backend's `authorize(...)` middleware.

The scoped staff roles are: `employee` (create/edit drivers and vehicles),
`entry_employee` (create and manage trip sheets), and `accountant` (manage the
cashbook). The UI hides all unrelated navigation and blocks the corresponding
routes; the API must enforce the same permissions.

## 4. Backend additions required

This repository is the frontend, so Redis must run in the API service rather than
in the browser. The frontend now keeps successful GET responses in a short-lived
30-second in-memory cache and invalidates it after a write. For shared caching
that avoids repeated database reads across users, add Redis to the backend:

- cache `GET /drivers`, `/vehicles`, `/trips`, `/payments`, and dashboard reads
  using keys that include the user scope and query parameters;
- invalidate the matching keys after every create/update/delete;
- never cache authorization decisions or store JWTs in Redis;
- keep MongoDB as the source of truth—writes always persist first, then invalidate.

The new frontend API contracts are `GET /users` and admin-only
`POST /auth/register` with `{ name, email, password, role }`, plus
`POST /trips/:id/driver-changes`. The last endpoint must append an immutable
`{ driverId, driverNameText, effectiveAt, reason }` event to `driverChanges`; it
must not replace `trip.driverId` or alter existing legs, expenses, or summaries.

## 5. Project structure

```
src/
├── lib/api.js            # Axios client + one function per backend route
├── context/AuthContext.jsx
├── components/           # Layout (sidebar), DataTable, Modal, StatCard, etc.
├── pages/
│   ├── Login.jsx
│   ├── Users.jsx
│   ├── Dashboard.jsx
│   ├── Drivers.jsx
│   ├── Vehicles.jsx
│   ├── Maintenance.jsx
│   ├── Payments.jsx
│   └── trips/
│       ├── TripsList.jsx
│       └── TripDetail.jsx  # the full digital trip sheet
└── App.jsx                 # routes
```

## 6. Notes on the design

The visual language ("OSR Logistics") is built around the physical trip-sheet
register the backend is modeled on: a dark "dispatch board" sidebar with a dashed
route line connecting nav stops, an off-white "paper" content area, tabular/mono
numerals for odometer and money figures, and a single safety-orange accent (the
color of highway signage and hazard markings) used sparingly for actions and alerts.

All API response shapes are read defensively (`res.data?.data || res.data`) since
exact envelope shape can vary slightly by backend implementation — adjust
`src/lib/api.js` if your backend's field names differ from the ones in its own
README (e.g. dashboard overview field names).
