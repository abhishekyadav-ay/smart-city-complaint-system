# 🏙️ Smart City Issue Reporting & Analytics System

Last updated: June 23, 2026

A full-stack web application for citizens to report city issues and administrators to manage and analyze them — powered by AI categorization, interactive maps, real-time analytics, and email notifications.

## Quick Local Run

Run backend and frontend locally for development/testing:

```bash
# Backend
cd backend
npm install
cp .env.example .env        # edit .env as needed
npm run seed-admin          # creates initial super admin
npm run dev                 # starts backend on http://localhost:5000

# Frontend (static)
cd ../frontend
# Option A: open index.html in browser
# Option B: serve with a static server
python3 -m http.server 3000
```


---

## 📁 Project Structure

```
smart-city/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js      # Admin login/register
│   │   ├── complaintController.js # CRUD for complaints
│   │   └── analyticsController.js # Analytics aggregation
│   ├── middleware/
│   │   ├── auth.js                # JWT verification
│   │   └── upload.js              # Multer image upload
│   ├── models/
│   │   ├── Admin.js               # Admin schema (bcrypt password)
│   │   └── Complaint.js           # Complaint schema
│   ├── routes/
│   │   ├── auth.js
│   │   ├── complaints.js
│   │   └── analytics.js
│   ├── scripts/
│   │   └── seedAdmin.js           # Seed default admin account
│   ├── utils/
│   │   ├── aiCategorize.js        # OpenAI + keyword classifier
│   │   └── sendEmail.js           # NodeMailer email service
│   ├── uploads/                   # Uploaded images (auto-created)
│   ├── .env.example               # Environment variable template
│   ├── package.json
│   └── server.js                  # Express entry point
│
└── frontend/
    ├── css/
    │   └── style.css              # Full design system
    ├── js/
    │   ├── main.js                # Complaint form logic + Maps
    │   └── admin.js               # Admin dashboard + Charts
    ├── index.html                 # Public complaint form
    └── admin.html                 # Admin portal
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ — https://nodejs.org
- **MongoDB** v6+ (local or Atlas) — https://mongodb.com
- **npm** or **yarn**

---

### Step 1 — Clone or Download

```bash
# If using git:
git clone <repo-url>
cd smart-city
```

---

### Step 2 — Backend Setup

```bash
cd backend
npm install
```

**Create your `.env` file:**

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Server
PORT=5000

# MongoDB — local or MongoDB Atlas
MONGO_URI=mongodb://localhost:27017/smart-city

# JWT secret (any long random string)
JWT_SECRET=change-me-to-a-very-long-random-secret

# OpenAI (for AI categorization)
# Get key at: https://platform.openai.com/api-keys
# Leave as-is to use keyword-based fallback classifier
OPENAI_API_KEY=sk-your-openai-api-key-here

# Email — Gmail with App Password
# Guide: https://support.google.com/accounts/answer/185833
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
ADMIN_EMAIL=admin-notification-email@gmail.com

# Frontend origin (for CORS)
FRONTEND_URL=http://localhost:3000

# Default admin credentials for seeding
DEFAULT_ADMIN_USER=admin
DEFAULT_ADMIN_PASS=admin123
```

> **Note:** If you don't have an OpenAI key, the system automatically falls back to a keyword-based classifier. If you don't configure email, resolution notifications are silently skipped. Both features degrade gracefully.

---

### Step 3 — Seed the Admin Account

```bash
npm run seed-admin
```

Output:
```
✅ Admin created — Username: admin | Password: admin123
```

---

### Step 4 — Start the Backend

```bash
# Development (auto-restart on changes):
npm run dev

# Production:
npm start
```

Output:
```
✅ MongoDB Connected: localhost
🚀 Smart City Server running on http://localhost:5000
```

---

### Step 5 — Frontend Setup

The frontend is **plain HTML/CSS/JS** — no build step needed.

**Option A: Open directly in browser**
```bash
# Just open in your browser:
open frontend/index.html
open frontend/admin.html
```

**Option B: Serve with a local server (recommended for Maps + API calls)**
```bash
# Using Python
cd frontend
python3 -m http.server 3000

# Or using Node.js live-server
npx live-server frontend --port=3000

# Or using VS Code Live Server extension
```

Then open:
- **Complaint Form:** http://localhost:3000
- **Admin Portal:** http://localhost:3000/admin.html

---

### Step 6 — Maps (Leaflet + OpenStreetMap)

This project uses **Leaflet** with **OpenStreetMap** tiles (no API key required). The frontend also uses Nominatim for reverse geocoding when a user clicks the map — this is a free service with usage limits. If you expect high traffic, consider using a paid geocoding provider or a caching proxy.

No Google Maps API key is required. The interactive map is initialized in `frontend/index.html` and `frontend/js/main.js` using Leaflet and OpenStreetMap tile layers. Reverse geocoding (coordinates → address) uses the Nominatim endpoint:

```
https://nominatim.openstreetmap.org/reverse?format=json&lat=<LAT>&lon=<LON>
```

Notes:
- For local testing nothing extra is needed — the map will render out-of-the-box.
- For production, review OpenStreetMap/Nominatim usage policies and consider using a commercial tile/geocoding provider or hosting tile services if you need higher SLAs.

---

## 🔑 API Reference

### Public Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/complaints` | Submit new complaint (multipart/form-data) |
| GET | `/api/health` | Health check |

### Admin Routes (require `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login → returns JWT |
| GET | `/api/auth/verify` | Verify JWT validity |
| GET | `/api/complaints` | List complaints (filter, paginate) |
| GET | `/api/complaints/:id` | Get single complaint |
| PUT | `/api/complaints/:id/status` | Update status + notes |
| DELETE | `/api/complaints/:id` | Delete complaint |
| GET | `/api/analytics` | Full analytics data |

### Query Parameters for `GET /api/complaints`

| Param | Values | Description |
|-------|--------|-------------|
| status | Pending, In Progress, Resolved | Filter by status |
| issueType | Pothole, Garbage, Streetlight, Water Issue, Others | Filter by category |
| search | string | Search name, description, location |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |

---

## ✨ Features

### 1. 🧑‍💼 Citizen Side
- **Complaint Form** with real-time validation
- **Google Maps** integration — click to place pin, autocomplete addresses, GPS geolocation
- **AI Category Auto-Detection** — click "AI Detect" for instant preview (full AI runs on submission)
- **Manual Category Override** — visual category picker
- **Image Upload** — drag & drop or browse, 5MB limit, preview before submit
- **Character Counter** on description field

### 2. 🤖 AI Categorization
- **OpenAI GPT-3.5** categorizes complaints into: Pothole, Garbage, Streetlight, Water Issue, Others
- **Graceful Fallback** — keyword-based classifier runs if OpenAI key isn't configured
- **Confidence Score** stored with each complaint

### 3. 🔐 Admin Portal
- **JWT Authentication** with 24h token expiry
- **Password visibility toggle**, login error messages
- **Auto-login** if valid token exists in localStorage

### 4. 📋 Complaint Management
- **Paginated table** with filters by status, category, and text search
- **Detail Modal** — full complaint info, image viewer, coordinate display
- **Status Update** — Pending → In Progress → Resolved
- **Admin Notes** — add internal comments to any complaint
- **Delete** with confirmation

### 5. 📊 Analytics Dashboard
- **4 KPI Cards** — Total, Pending, In Progress, Resolved
- **Daily Trend** line chart (7/14/30 day toggle)
- **Category Donut Chart** and **Bar Chart**
- **Status Progress Bars** with percentage
- **Resolution Rate** and **Average Resolution Time**
- **Most Frequent Issue** type

### 6. 📧 Email Notifications
- **On complaint submission:** user receives complaint received email with tracking ID
- **On complaint submission:** admin receives new complaint alert email
- **On every admin update:** user receives status/notes update email
- **On Status → Resolved:** user receives branded resolution email
- All notifications use NodeMailer with Gmail

---

## 🔧 Troubleshooting

### MongoDB Connection Failed
- Ensure MongoDB is running: `mongod --dbpath /data/db`
- Or use MongoDB Atlas — update MONGO_URI with your Atlas connection string

### CORS Error in Browser
- Ensure `FRONTEND_URL` in `.env` matches where you're serving the frontend
- Default is `*` (allow all) if not set

### Images Not Showing in Admin
- Ensure backend is running on port 5000
- Check that `uploads/` folder exists in `backend/`

### Email Not Sending
- Use Gmail App Password, not your regular password
- Enable 2FA on Gmail first, then generate App Password
- Guide: https://support.google.com/accounts/answer/185833

### OpenAI Quota Error
- The keyword classifier fallback activates automatically
- No action needed — complaints are still categorized

---

## 🌐 Deploy (Public Access)

### Backend on Render
- Push latest code to GitHub.
- In Render, create **New + > Blueprint** and select this repo.
- Render will read `render.yaml` and create `smart-city-api` from `backend/`.
- In Render service env vars, set:
  - `MONGO_URI`
  - `JWT_SECRET`
  - `EMAIL_USER` and `EMAIL_PASS` (optional)
  - `FRONTEND_URL` (your Netlify site URL)
  - `ALLOWED_ORIGINS` (comma-separated extra origins, optional)
- After deploy, copy backend URL (example: `https://your-backend.onrender.com`).

### Frontend on Netlify
- In Netlify, create site from this GitHub repo.
- Build settings:
  - Build command: *(leave empty)*
  - Publish directory: `frontend`
- Edit `netlify.toml` and replace:
  - `https://YOUR-BACKEND-URL.onrender.com` with your real Render backend URL.
- Redeploy site.

### Alternative without changing `netlify.toml`
- In browser console on deployed frontend, run:
  - `localStorage.setItem('SMART_CITY_API_BASE','https://your-backend.onrender.com/api')`
  - then refresh.
- This is useful for quick testing if proxy is not configured yet.

### Verify Deployment
- Open frontend URL from another device (same internet): should load form/dashboard.
- Test backend directly:
  - `https://your-backend.onrender.com/api/health`
  - `https://your-backend.onrender.com/api/health/email`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| AI | OpenAI GPT-3.5-turbo |
| Email | NodeMailer (Gmail) |
| Images | Multer (local disk) |
| Maps | Leaflet + OpenStreetMap (Nominatim for geocoding) |
| Charts | Chart.js v4 |
| Frontend | Vanilla HTML/CSS/JS |
| Fonts | DM Sans + DM Serif Display |

---

## 🔒 Security Notes

- Change `JWT_SECRET` to a strong random value in production
- Restrict Google Maps API key by referrer/IP
- Add rate limiting (e.g., `express-rate-limit`) on complaint submission in production
- Store uploaded images on cloud storage (S3/Cloudinary) in production
- Enable MongoDB authentication in production

---

## 📄 License

MIT — free to use and modify.
