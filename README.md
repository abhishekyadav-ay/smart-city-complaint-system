# Smart City Complaint System

A simple full-stack app for citizens to report city issues and for admins to manage, track, and analyze complaints.

## What this project does
- Public complaint form with image upload and location capture
- Admin dashboard to review and update complaints
- Basic analytics for issue trends and status summary
- Optional AI-based categorization with a keyword-based fallback

## Tech stack
- Backend: Node.js + Express + MongoDB + Mongoose
- Frontend: Plain HTML, CSS, and JavaScript
- Auth: JWT for admin access
- File uploads: Multer

## Project structure
```text
smart-city/
├── backend/         # Express API, MongoDB models, auth, routes
├── frontend/        # Public and admin pages
├── render.yaml       # Render deployment config
├── netlify.toml     # Netlify config
└── README.md        # Project overview
```

## Quick start

### 1) Backend setup
```bash
cd backend
npm install
cp .env.example .env
```

Update the values in `.env` for your MongoDB connection, JWT secret, and optional email/OpenAI settings.

### 2) Seed the admin account
```bash
npm run seed-admin
```

### 3) Start the backend
```bash
npm run dev
```

The API will run at http://localhost:5000.

### 4) Serve the frontend
```bash
cd ../frontend
python -m http.server 3000
```

Open http://localhost:3000 for the public form and http://localhost:3000/admin.html for the admin portal.

## API highlights
- `GET /api/health` — health check
- `POST /api/complaints` — submit a complaint
- `GET /api/complaints` — list complaints for admins
- `POST /api/auth/login` — admin login

## Notes
- The frontend is intentionally kept simple with no build step.
- If OpenAI credentials are not configured, the app falls back to a keyword-based classifier.
- Uploaded images are stored locally in the backend uploads folder during development.

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

| Layer    | Technology |
|----------|-----------|
| Backend  | Node.js + Express.js |
| Database | MongoDB + Mongoose   |
| Auth     | JWT + bcryptjs       |
| AI       | OpenAI GPT-3.5-turbo |
| Email    | NodeMailer (Gmail)   |
| Images   | Multer (local disk)  |
| Maps     | Leaflet + OpenStreetMap (Nominatim for geocoding) |
| Charts   | Chart.js v4          |
| Frontend | Vanilla HTML/CSS/JS  |
| Fonts    | DM Sans + DM Serif Display |

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
