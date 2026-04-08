# 🏙️ Smart City Issue Reporting & Analytics System

A full-stack web application for citizens to report city issues and administrators to manage and analyze them — powered by AI categorization, interactive maps, real-time analytics, and email notifications.

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

### Step 6 — Google Maps (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable: **Maps JavaScript API** and **Places API** and **Geocoding API**
3. Create an API key
4. Replace `YOUR_GOOGLE_MAPS_API_KEY` in `frontend/index.html`:

```html
<!-- Both occurrences in the script tag near the bottom: -->
<script>
  const GOOGLE_MAPS_KEY = 'AIzaSy...your-key';
</script>
<script async defer
  src="https://maps.googleapis.com/maps/api/js?key=AIzaSy...your-key&...">
</script>
```

> Without a Maps key, the address input still works (manual text entry). The map area just won't render.

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
- **On Status → Resolved:** Branded HTML email with complaint details
- **On Status → In Progress:** Simple status update email
- Both use NodeMailer with Gmail

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

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| AI | OpenAI GPT-3.5-turbo |
| Email | NodeMailer (Gmail) |
| Images | Multer (local disk) |
| Maps | Google Maps JS API |
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
