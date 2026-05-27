# 📡 DownDetect

Real-time monitoring for internal services. Dashboard for uptime, response time and status checks. **API-only management with X-API-Key authentication.**

---

## ✨ Features

### 📊 Monitoring

- **Real-time status** for all registered applications
- **Response time** and version from service headers
- **24-hour graphs** — latency and availability over the last 24 hours
- **Recent Activity** — table shows the last 20 checks (independent of time window)
- **Automatic checks** on a configurable interval
- **Healthy / Degraded / Unhealthy** status with clear badges
- **Maintenance stubs** — when `isActive=false`, an HTTP stub page is served on `port` (same port as the real site; TLS via nginx)
- **Push notifications** — Android app receives alerts when status changes to degraded or unhealthy

### 🔐 API & Security

- **Read-only dashboard** — no add/delete/check buttons in the UI
- **X-API-Key** required for create, update, delete and manual check
- **Data retention** — measurements older than 24 hours are auto-deleted
- **Single source of truth** — database in `data/` at project root
- **Title hover** — on hover over "DownDetect" shows **Developed by NS Staff** (link from `STAFF_URL` / `VITE_STAFF_URL`) and app version from `package.json`

### 📁 Data

- **SQLite** database: `data/system.db`
- **24h retention** — set `EXPIRE_HOURS=24` in `.env`
- **No dist/data** — all data lives in project root `data/`

---

## 🏗️ Project Structure

```
DownDetect/
├── client/                 # React frontend
│   └── src/
│       ├── pages/          # Dashboard, AppDetails
│       ├── components/     # UI components
│       └── hooks/          # use-apps, etc.
├── server/                 # Express API
│   ├── index.ts            # Entry point
│   ├── routes.ts           # API routes & auth (X-API-Key)
│   ├── storage.ts          # DB layer
│   ├── push.ts             # Firebase Cloud Messaging
│   └── db.ts               # SQLite connection (data/system.db)
├── shared/                 # Shared types & API schema
│   ├── routes.ts           # API paths & Zod schemas
│   └── schema.ts           # Drizzle schema
├── data/                   # Runtime data (created on first run)
│   └── system.db           # SQLite database
├── .env                    # KEY_ACCESS, EXPIRE_HOURS, PORT, GOOGLE_APPLICATION_CREDENTIALS, etc.
├── package.json
└── README.md
```

---

## ⚙️ Installation and Run

### Requirements

- Node.js 18+
- npm or pnpm

### Installation

1. Clone the project:

```bash
git clone <repo_url>
cd DownDetect
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables in `.env`:

```env
# API key for create/update/delete/check (required for protected endpoints)
KEY_ACCESS=your_secret_key_here

# Optional: expose key to frontend (e.g. for dev)
# VITE_KEY_ACCESS=your_secret_key_here

# Data retention: delete checks older than N hours (default: 24)
EXPIRE_HOURS=24

# Auto-check interval in minutes (default: 1)
VITE_AUTO_TIME=1

# Server port (default: 4635)
PORT=4635

# Staff link: shown in title hover plaque (VITE_STAFF_URL = same for frontend)
STAFF_URL=https://your-staff-site.com
VITE_STAFF_URL=https://your-staff-site.com

# Push notifications (optional): path to Firebase service account JSON
GOOGLE_APPLICATION_CREDENTIALS=data/firebase-service-account.json

# Optional: send push on every degraded/unhealthy check (default: only on transition from healthy)
NOTIFY_ON_EVERY_BAD_CHECK=true
```

4. Run in development:

```bash
npm run dev
```

5. Or build and run in production:

```bash
npm run build
npm start
```

---

## 🔌 API Reference

### Authentication

Protected endpoints require the **X-API-Key** header:

```http
X-API-Key: <KEY_ACCESS>
```

### Public Endpoints (no auth)

| Method | Endpoint                                   | Description                                  |
| ------ | ------------------------------------------ | -------------------------------------------- |
| GET    | `/api/health`                              | Health check                                 |
| GET    | `/api/apps`                                | List all apps with last check                |
| GET    | `/api/apps/:internal_name`                 | Get one app                                  |
| GET    | `/api/apps/:internal_name/status?hours=24` | Status checks in last N hours (for charts)   |
| GET    | `/api/apps/:internal_name/status?limit=20` | Last N checks (for Recent Activity table)    |
| GET    | `/api/apps/:internal_name/stats?hours=24`  | Uptime & avg latency (last N hours)          |
| POST   | `/api/register-push`                       | Register FCM token (body: `{"token":"..."}`) |

### Protected Endpoints (X-API-Key required)

| Method | Endpoint                         | Description                           |
| ------ | -------------------------------- | ------------------------------------- |
| POST   | `/api/apps`                      | Add application                       |
| PUT    | `/api/apps/:internal_name`       | Update application                    |
| DELETE | `/api/apps/:internal_name`       | Delete application                    |
| POST   | `/api/apps/:internal_name/check` | Trigger manual check                  |
| GET    | `/api/push-status`               | Check push config & device count      |
| POST   | `/api/test-push`                 | Send test notification to all devices |

### Example: Add application

```bash
curl -X POST "http://localhost:4635/api/apps" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_secret_key_here" \
  -d '{"internalName":"my-api","displayName":"My API","baseUrl":"https://api.example.com","port":8080,"isActive":true}'
```

### Example: Enable maintenance (stub on port)

```bash
curl -X PUT "http://localhost:4635/api/apps/my-api" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_secret_key_here" \
  -d '{"isActive":false,"port":8080}'
```

When `isActive` is `false`, DownDetect starts an HTTP server on `0.0.0.0:<port>` with a maintenance page (503). Monitoring skips inactive apps. Set `port` to the same port your site uses (nginx terminates HTTPS).

### Example: Trigger manual check

```bash
curl -X POST "http://localhost:4635/api/apps/my-api/check" \
  -H "X-API-Key: your_secret_key_here"
```

### Example: Delete application

```bash
curl -X DELETE "http://localhost:4635/api/apps/my-api" \
  -H "X-API-Key: your_secret_key_here"
```

---

## 📊 Data & Retention

- **Database:** `data/system.db` (created on first run)
- **Retention:** Checks older than `EXPIRE_HOURS` (default 24) are deleted automatically (on startup and every hour)
- **Graphs:** Charts use data from the last 24 hours (`?hours=24`)
- **Recent Activity:** Table shows the last 20 checks (`?limit=20`)
- **No UI for add/delete/check** — use the API with X-API-Key

---

## 🆘 Troubleshooting

### Unauthorized (401)

- Ensure `X-API-Key` header is set and matches `KEY_ACCESS` in `.env`
- Restart the server after changing `.env`

### No data on graphs

- Confirm checks are running (auto-interval or `POST .../check`)
- Default window is 24 hours; older data is removed

### Database path

- Data is stored in `data/` at the project root, not in `dist/data`
- Run `npm start` from the project root so `data/system.db` is used
