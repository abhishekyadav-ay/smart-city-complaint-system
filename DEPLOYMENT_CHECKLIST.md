# Deployment Checklist — Smart City Complaint Management System

## 1. Files changed for production
- `backend/server.js`
- `backend/config/db.js`
- `backend/controllers/authController.js`
- `backend/middleware/auth.js`
- `backend/middleware/optionalAuth.js`
- `backend/utils/sendEmail.js`
- `backend/.env.example`
- `frontend/js/main.js`
- `frontend/js/admin.js`
- `netlify.toml`

## 2. Required environment variables
- `MONGO_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — strong random JWT signing secret
- `ADMIN_SECRET_KEY` — secret for admin bootstrap registration
- `FRONTEND_URL` — Netlify site URL for production CORS
- `ALLOWED_ORIGINS` — optional comma-separated extra allowed origins
- `EMAIL_USER` — SMTP login email
- `EMAIL_PASS` — SMTP login password or app password
- `EMAIL_SMTP_HOST` — e.g. `smtp.gmail.com`
- `EMAIL_SMTP_PORT` — e.g. `465`
- `EMAIL_SMTP_SECURE` — `true` or `false`
- `ADMIN_EMAIL` — notification email for new complaints
- `OPENAI_API_KEY` — optional key for AI classification

## 3. Backend deployment on Render
1. Create a Render Web Service.
2. Use the `backend` folder as the project root.
3. Set `Runtime` to Node.
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Set health check path: `/api/health`
7. Add the environment variables listed above.
8. Deploy and wait for the service URL.
9. Verify backend health with `https://<render-service>.onrender.com/api/health`.

## 4. Frontend deployment on Netlify
1. Connect your repository to Netlify.
2. Set build publish directory: `frontend`.
3. Add a `_redirects` or `netlify.toml` redirect from `/api/*` to `https://<render-service>.onrender.com/api/:splat`.
4. Add a second redirect from `/uploads/*` to `https://<render-service>.onrender.com/uploads/:splat`.
5. Deploy the frontend.
6. Set `FRONTEND_URL` in Render to your Netlify site URL.

## 5. Validation checklist
- [ ] Backend starts successfully with `MONGO_URI`, `JWT_SECRET`, and `FRONTEND_URL` set.
- [ ] `POST /api/auth/login` returns JWT.
- [ ] `GET /api/health` returns `db: connected`.
- [ ] `GET /api/health/email` returns SMTP verification when email is configured.
- [ ] Uploads route is accessible at `/uploads/<filename>` through Netlify proxy.
- [ ] Public frontend uses `/api` proxy to access backend.
- [ ] Admin panel images use `API_ORIGIN` correctly for uploads.

## 6. Notes
- `backend/.env.example` is updated for Atlas and production values.
- `netlify.toml` includes redirects for both `/api/*` and `/uploads/*`.
- `backend/server.js` now validates required env vars and hardens CORS.
- `backend/utils/sendEmail.js` supports explicit SMTP host settings and skips notifications safely when creds are absent.
