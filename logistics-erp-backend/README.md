# Logistics ERP — Backend API (MongoDB)

A complete, industry-ready backend for a trucking / logistics ERP, built to match your
physical **TRIP SHEET** register exactly. Employees and admins log trips manually (nothing
is auto-calculated by force), and the dashboard aggregates profit/loss from that data —
daily, weekly, monthly, and yearly.

Built with **Node.js + Express + MongoDB (Mongoose ODM)**, ready to run locally in
minutes and to deploy to **AWS (DocumentDB/Atlas + S3 + EC2/Elastic Beanstalk/ECS)**
with just an `.env` change.

---

## 1. What's included

| Module | What it does |
|---|---|
| **Auth & access** | JWT login, configurable module permissions, Admin, Co-admin, Employee, Entry employee and Accountant roles |
| **Trip Management** | Full digital version of your paper trip sheet: header, multiple leg entries, expense box, summary box |
| **Drivers** | Driver master with license, docs, photo, salary info |
| **Vehicles** | Vehicle master with RC/insurance/permit/fitness/PUC expiry tracking |
| **Maintenance** | Pending / upcoming / ongoing / completed servicing, due-date & odometer alerts, and an approval request for the service cost |
| **Inventory** | Stock purchase requests, approval and accountant-payment gate before stock becomes available; stock can be consumed by maintenance |
| **Approvals** | Single request → approve/reject → paid queue for driver advances, maintenance and inventory purchases |
| **Client Fleets** | Client fleet register with responsible person and vehicle assignments |
| **Payments** | Cash & online payment book, linked to trips/vehicles/drivers, with summary totals and payments created from approved requests |
| **Dashboard** | Profit/loss aggregation by day/week/month/year, vehicle-wise performance, today's snapshot |
| **File uploads** | Driver photos, license docs, vehicle RC/insurance docs, maintenance invoices, payment receipts — stored locally by default, or on AWS S3 with one env variable |

Every data field in Drivers, Vehicles, Trips, Maintenance, and Payments is **optional**
at the database level — exactly as you asked, because the sheet is filled manually and
nothing should block saving a partially-filled record.

---

## 2. Project structure

```
logistics-erp-backend/
├── src/
│   ├── config/
│   │   ├── db.js              # Mongoose connection (local Mongo, Docker, or Atlas)
│   │   └── aws.js              # AWS SDK / S3 config
│   ├── models/                 # Mongoose schemas
│   │   ├── User.js
│   │   ├── Driver.js
│   │   ├── Vehicle.js
│   │   ├── Trip.js             # Trip + embedded entries[], expense{}, summary{}
│   │   ├── Maintenance.js
│   │   ├── Payment.js
│   │   ├── ApprovalRequest.js
│   │   ├── InventoryItem.js
│   │   └── Fleet.js
│   ├── controllers/           # Business logic for every module
│   ├── routes/                 # Express routers, one per module
│   ├── middlewares/
│   │   ├── auth.js             # JWT verification + role guard
│   │   ├── errorHandler.js     # Centralized error responses (Mongoose-aware)
│   │   └── upload.js           # multer -> local disk OR AWS S3
│   ├── utils/
│   │   └── calculations.js     # Optional helper to SUGGEST trip summary numbers
│   ├── app.js                  # Express app (middleware + routes)
│   └── server.js               # Entry point, connects MongoDB and starts the server
├── scripts/
│   └── seed.js                 # Creates the first admin user + sample vehicle/driver
├── uploads/                     # Local file storage (used when STORAGE_DRIVER=local)
├── .env.example
├── docker-compose.yml           # One command: API + local MongoDB
├── Dockerfile
├── package.json
└── README.md
```

### Why the Trip data is embedded, not in separate tables

MongoDB is a document database, so instead of four separate SQL tables (trip, trip
entries, trip expense, trip summary) joined by foreign keys, a **Trip document embeds
its own `entries[]` array, `expense{}` object, and `summary{}` object** directly. This
maps naturally to the paper sheet — fetching one trip fetches its whole sheet in a
single query, with no joins.

---

## 3. Quick start (run in under 5 minutes, no AWS account needed yet)

You need **Docker Desktop** installed. That's it.

```bash
# 1. Unzip the project and go inside
cd logistics-erp-backend

# 2. Copy the example env file
cp .env.example .env
# (Windows PowerShell: copy .env.example .env)

# 3. Start MongoDB + the API together
docker compose up --build

# 4. In a second terminal, create the first admin user + sample data
docker compose exec api npm run seed
```

The API is now live at **http://localhost:5000**.
Health check: http://localhost:5000/health

Server status (useful for confirming a Render free-tier instance has finished waking):
http://localhost:5000/api/status

Default admin login (created by the seed script, change these in `.env` before seeding
in a real deployment):
```
email:    admin@logistics.com
password: Admin@123
```

### Alternative: run without Docker (Node + MongoDB installed manually)

1. Install [MongoDB Community Server](https://www.mongodb.com/try/download/community)
   and make sure it's running locally (default port `27017`).
2. Then:
```bash
npm install
cp .env.example .env
# MONGO_URI in .env already defaults to mongodb://localhost:27017/logistics_erp
npm run seed     # creates admin user + sample data
npm run dev        # starts with nodemon (auto-restart on file changes)
# or: npm start
```

### Alternative: MongoDB Compass (GUI) to inspect your data

Install [MongoDB Compass](https://www.mongodb.com/products/compass) and connect to
`mongodb://localhost:27017` to browse the `logistics_erp` database visually — see
trips, drivers, vehicles, maintenance, and payments as documents while you test the API.

---

## 4. How authentication works

1. `POST /api/auth/login` with `{ email, password }` → returns a JWT `token`.
2. Send that token on every other request:
   `Authorization: Bearer <token>`
3. Module access is enforced by the role's permissions. Admin has all modules; Co-admin
   can approve requests and assign fleets; Accountant marks approved requests as paid;
   Employees can submit maintenance, inventory and driver-payment requests. Admin manages
   users and roles.

---

## 5. API Reference

All routes are prefixed with `/api` (configurable via `API_PREFIX` in `.env`).
All routes except `/api/auth/login` require the `Authorization: Bearer <token>` header.
Every `:id` in these routes is a MongoDB ObjectId (24-character hex string).

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/register` | Create user (admin only) |
| GET | `/api/auth/me` | Current logged-in user |
| GET | `/api/users` | List users, newest first (admin only) |
| POST | `/api/users` | Create a user and assign role category (admin only) |
| PUT | `/api/users/:id` | Edit user information, role category, status, or password (admin only) |
| GET | `/api/roles` | List role categories and their module access (admin only) |
| POST | `/api/roles` | Create a role category with module permissions (admin only) |
| PUT | `/api/roles/:key` | Edit a role category's module permissions (admin only) |
| GET | `/api/status` | Public server status / health check |
| GET | `/api/inventory` | List stock items (requires Inventory access) |
| POST | `/api/inventory` | Create a stock-purchase request; stock becomes available after approval and payment |

### Approval requests
| Method | Route | Description |
|---|---|---|
| GET | `/api/approvals?status=&requestType=` | List driver, maintenance and inventory approval requests |
| POST | `/api/approvals` | Submit a driver payment, maintenance or inventory request |
| PUT | `/api/approvals/:id/approve` | Approve a requested item (Admin/Co-admin) |
| PUT | `/api/approvals/:id/reject` | Reject a requested item (Admin/Co-admin) |
| PUT | `/api/approvals/:id/pay` | Mark an approved request paid and create its Cashbook payment (Admin/Accountant) |

### Client fleets
| Method | Route | Description |
|---|---|---|
| GET | `/api/fleets` | List fleets, people and assigned vehicles |
| POST | `/api/fleets` | Create a client fleet |
| PUT | `/api/fleets/:id` | Update fleet details (Admin/Co-admin) |
| PUT | `/api/fleets/:id/assign` | Assign responsible person and vehicle IDs (Admin/Co-admin) |

### Drivers
| Method | Route | Description |
|---|---|---|
| GET | `/api/drivers?status=&search=&page=&limit=` | List drivers |
| GET | `/api/drivers/:id` | Driver detail |
| POST | `/api/drivers` | Create driver |
| PUT | `/api/drivers/:id` | Update driver |
| DELETE | `/api/drivers/:id` | Delete driver (admin) |
| POST | `/api/drivers/:id/photo` | Upload photo (`multipart/form-data`, field `file`) |
| POST | `/api/drivers/:id/license-doc` | Upload license document |

### Vehicles
| Method | Route | Description |
|---|---|---|
| GET | `/api/vehicles?status=&search=&page=&limit=` | List vehicles |
| GET | `/api/vehicles/expiring-documents?days=30` | RC/insurance/permit/fitness/PUC expiring soon |
| GET | `/api/vehicles/:id` | Vehicle detail (includes assigned drivers) |
| POST | `/api/vehicles` | Create vehicle |
| PUT | `/api/vehicles/:id` | Update vehicle |
| DELETE | `/api/vehicles/:id` | Delete vehicle (admin) |
| POST | `/api/vehicles/:id/photo` | Upload photo |
| POST | `/api/vehicles/:id/document` | Upload RC/insurance doc (`docType=rc|insurance` in body) |

### Trips (the digital Trip Sheet)
| Method | Route | Description |
|---|---|---|
| GET | `/api/trips?vehicleId=&driverId=&status=&from=&to=&search=` | List trips |
| GET | `/api/trips/:id` | Full trip (entries + expense + summary) |
| POST | `/api/trips` | Create trip — see payload shape below |
| PUT | `/api/trips/:id` | Update trip header fields |
| DELETE | `/api/trips/:id` | Delete trip (admin) |
| POST | `/api/trips/:id/entries` | Add one leg row |
| PUT | `/api/trips/:id/entries/:entryId` | Update a leg row |
| DELETE | `/api/trips/:id/entries/:entryId` | Delete a leg row |
| PUT | `/api/trips/:id/expense` | Create/update the expense box |
| PUT | `/api/trips/:id/summary` | Create/update the summary box |
| POST | `/api/trips/:id/calculate` | Returns **suggested** summary numbers (does not save) |

**Create trip payload example** (every field optional, matches the sheet 1:1):

```json
{
  "vehicleNoText": "UP32QN3385",
  "driverNameText": "PREM",
  "startDate": "2026-07-20",
  "endDate": "2026-07-31",
  "timeIn": "7:48 PM",
  "timeOut": "8:52 PM",
  "remark": "RS.10000 SUBMIT TO AMIT[5679],ADV",
  "entries": [
    { "date": "2026-07-20", "partyName": "DEEPU JI", "fromLocation": "KURSI ROAD", "toLocation": "PATNA", "freight": 41500, "odometer": 303188, "adv": 6720, "diesel": 278.59, "amt": 26560.77 },
    { "date": "2026-07-22", "fromLocation": "PATNA", "toLocation": "LUCKNOW", "freight": 12000, "odometer": 304674, "adv": 12000 },
    { "date": "2026-07-25", "fromLocation": "KAKORI", "toLocation": "BARABANKI", "freight": 9500, "adv": -10000 },
    { "date": "2026-07-28", "fromLocation": "KAKORI", "toLocation": "SITAPUR", "freight": 11000 }
  ],
  "expense": {
    "dala": 2250, "border": 500, "tollTax": 6650, "diesel": 26561,
    "salary": 6600, "urea": 490, "fooding": 3300, "ureaNagad": 330, "kiraya": 100
  },
  "summary": {
    "drAdv": 8720, "expenseTotal": -6480, "total": 2240,
    "gpsKm": 1433, "mtrKm": 1486, "diffKm": -30,
    "totalDieselLitres": 278.59, "totalDieselAmount": 26561,
    "costPerKm": 31.48, "mileage": 5.33, "expensePercent": 63.22,
    "freightPerKm": 49.8, "plPerDay": 2474.45, "days": 11,
    "tankFullLitres": 185, "tankFullAmount": 17652.7, "tankFullDate": "2026-07-20", "tankFullTime": "7:48 PM",
    "freightTotal": 74000, "expensesTotal": -46781, "profitLoss": 27219
  }
}
```

If you already have master records, you can also link them by ObjectId instead of, or
alongside, the free-text fields: pass `"vehicleId": "<vehicle _id>"` and/or
`"driverId": "<driver _id>"` in the same request body.

> All the `summary` numbers can instead be left out and pre-filled on the frontend by
> calling `POST /api/trips/:id/calculate` first, which computes freight totals, expense
> totals, expense %, P/L, and P/L-per-day from the entries/expense already saved. GPS KM,
> MTR KM and mileage still need a manual figure since they come from the vehicle/GPS
> device, exactly like on the paper sheet.

### Maintenance
| Method | Route | Description |
|---|---|---|
| GET | `/api/maintenance?status=&vehicleId=&priority=` | List maintenance records |
| GET | `/api/maintenance/alerts?days=15` | Grouped pending/upcoming/ongoing + due-soon list |
| GET | `/api/maintenance/:id` | Detail |
| POST | `/api/maintenance` | Create record and its maintenance-cost approval request |
| PUT | `/api/maintenance/:id` | Update record |
| DELETE | `/api/maintenance/:id` | Delete (admin) |
| POST | `/api/maintenance/:id/invoice` | Upload service invoice |

### Payments (cash + online book)
| Method | Route | Description |
|---|---|---|
| GET | `/api/payments?paymentType=&direction=&category=&vehicleId=&driverId=&tripId=&from=&to=` | List payments |
| GET | `/api/payments/summary?from=&to=` | Cash vs online, received vs paid totals |
| GET | `/api/payments/:id` | Detail |
| POST | `/api/payments` | Create payment |
| PUT | `/api/payments/:id` | Update payment |
| DELETE | `/api/payments/:id` | Delete (admin) |
| POST | `/api/payments/:id/receipt` | Upload receipt |

### Dashboard
| Method | Route | Description |
|---|---|---|
| GET | `/api/dashboard/summary?period=daily\|weekly\|monthly\|yearly&from=&to=` | Freight/expense/P&L bucketed by period |
| GET | `/api/dashboard/trend?period=...` | Same data, meant for chart components |
| GET | `/api/dashboard/overview` | Today's snapshot + all-time totals + maintenance counts + cash/online totals + vehicle counts |
| GET | `/api/dashboard/vehicle-performance?from=&to=` | Per-vehicle freight/expense/profit ranking |

> The dashboard uses MongoDB's aggregation pipeline (`$dateTrunc`, `$group`, `$lookup`)
> directly against the `trips` collection's embedded `summary` field — no joins across
> separate tables needed. Requires MongoDB 5.0+ (the `mongo:7` image in
> `docker-compose.yml` already satisfies this).

---

## 6. Moving to AWS (when you're ready to go live)

### 6.1 Database → MongoDB Atlas (managed, easiest) or Amazon DocumentDB
**Option A — MongoDB Atlas (recommended, works from anywhere, generous free tier):**
1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Add your server's IP (or `0.0.0.0/0` for testing) to the Atlas network access list.
3. Copy the connection string and set it in `.env`:
   ```
   MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/logistics_erp
   ```
   No other code changes needed.

**Option B — Amazon DocumentDB (MongoDB-compatible, stays inside AWS/VPC):**
1. Create a DocumentDB cluster in the AWS Console.
2. DocumentDB requires TLS and is only reachable from inside your VPC (e.g. from an EC2
   instance or Lambda in the same VPC) — set:
   ```
   MONGO_URI=mongodb://<user>:<password>@<docdb-endpoint>:27017/logistics_erp?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
   ```
   and download AWS's `global-bundle.pem` certificate bundle into your deployment.
   Note: DocumentDB doesn't support every MongoDB 5.0+ operator — verify `$dateTrunc`
   (used in the dashboard aggregation) is available on your DocumentDB engine version,
   or use MongoDB Atlas instead if you hit compatibility gaps.

### 6.2 File storage → Amazon S3
1. Create an S3 bucket, e.g. `logistics-erp-files`.
2. Create an IAM user with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` permissions
   scoped to that bucket, and generate an access key.
3. Update `.env`:
   ```
   STORAGE_DRIVER=s3
   AWS_ACCESS_KEY_ID=xxxxxxxx
   AWS_SECRET_ACCESS_KEY=xxxxxxxx
   AWS_REGION=ap-south-1
   AWS_S3_BUCKET=logistics-erp-files
   ```
   No code changes needed — `src/middlewares/upload.js` automatically switches from local
   disk to S3 based on `STORAGE_DRIVER`.

### 6.3 Hosting the API
Any of these work with zero code changes:
- **Elastic Beanstalk** (easiest — deploy the zip directly, it runs `npm start`)
- **EC2** — clone the code, `npm install`, run with `pm2` or as a `systemd` service, put
  it behind an Nginx reverse proxy with HTTPS (Let's Encrypt / ACM)
- **ECS / Fargate** — use the included `Dockerfile`, push to **ECR**, run as a Fargate service

### 6.4 Environment variables in AWS
Store `.env` values as **Elastic Beanstalk environment properties**, **ECS task
definition environment variables**, or **AWS Secrets Manager** — never commit `.env`
to source control (it's already in `.gitignore`).

---

## 7. Building your frontend against this API

- Base URL: `http://localhost:5000/api` locally, or your deployed URL + `/api`.
- Every list endpoint supports pagination via `?page=&limit=` (limits are capped at 100) and returns:
  ```json
  { "success": true, "data": [...], "pagination": { "total": 42, "page": 1, "limit": 20, "totalPages": 3, "hasNextPage": true, "hasPreviousPage": false } }
  ```
- Create and update requests accept the same relationship aliases: `vehicleId`, `driverId`, and (for payments) `tripId`. Sending an empty relationship ID on update clears that relationship. Trip `PUT` also accepts the full `entries`, `expense`, and `summary` form payload.
- Date-only `to` filters include the entire selected final day, which keeps dashboard and list date pickers intuitive.
- Every write endpoint (`POST`/`PUT`) returns `{ "success": true, "data": {...} }`.
- Errors always return `{ "success": false, "message": "..." }` with an appropriate
  HTTP status code (400/401/403/404/500).
- For file uploads, send `multipart/form-data` with the field name `file`.
- Every ID in the API (`_id`) is a MongoDB ObjectId string — pass it back exactly as
  received when referencing a driver/vehicle/trip elsewhere.
- **Dashboard** section of your frontend → call `/api/dashboard/overview` for the landing
  cards, and `/api/dashboard/summary?period=daily|weekly|monthly|yearly` for charts.
- **Trip Management** section → `POST /api/trips` to create, `GET /api/trips` to list,
  `GET /api/trips/:id` for the full sheet view.
- **Drivers / Vehicles** sections → standard CRUD against `/api/drivers` and `/api/vehicles`.
- **Maintenance** section → `/api/maintenance/alerts` gives you the pending/upcoming/ongoing
  buckets directly, ready to render as three columns or tabs.
- **Approval queue** → send a request to `/api/approvals`, then the Admin/Co-admin approves
  it and the Accountant calls `/api/approvals/:id/pay`; that payment is automatically visible
  in the Cashbook.
- **Inventory** → `POST /api/inventory` creates a pending purchase record. It is only usable
  by maintenance after the linked approval request has been marked paid.
- **Client fleets** → create with `/api/fleets`, then assign a person and `vehicleIds` through
  `/api/fleets/:id/assign`.
- **Payment Book** section → `/api/payments` list + `/api/payments/summary` for the
  cash-vs-online totals at the top of the page.

---

## 8. Useful commands

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start with auto-reload (nodemon) |
| `npm start` | Start in production mode |
| `npm run seed` | Create first admin user + sample vehicle/driver |
| `docker compose up --build` | Start API + MongoDB together |
| `docker compose exec api npm run seed` | Run the seed script inside the container |
| `docker compose down` | Stop everything |
| `docker compose down -v` | Stop and wipe the database volume (fresh start) |

---

## 9. Security notes before going live

- Change `JWT_SECRET` in `.env` to a long random string.
- Change the seeded admin password immediately after first login.
- Restrict MongoDB Atlas/DocumentDB network access to known IPs, not `0.0.0.0/0`.
- Restrict your S3 bucket access via IAM, not public access.
- Put the API behind HTTPS (ACM certificate + ALB, or Let's Encrypt + Nginx on EC2).
- Consider adding `express-rate-limit` (already in `package.json`) to the auth routes if
  you expose login publicly — wire it into `src/app.js` if needed.
