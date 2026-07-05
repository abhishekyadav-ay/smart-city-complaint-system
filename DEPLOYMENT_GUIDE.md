# Quick Deployment Guide — Smart City System

## Why Page Fails to Load
- Backend is not running or not accessible
- Frontend API endpoint is pointing to wrong URL
- Environment variables are not configured

---

## Step 1: Test Backend Locally (5 minutes)

### Prerequisites
- Node.js installed
- MongoDB running locally OR use MongoDB Atlas (cloud)

### Start Backend
```bash
cd backend
npm install
npm start
```

Should output:
```
Server running on port 5000
Database connected
```

Test health check:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "db": "connected",
  "timestamp": "..."
}
```

---

## Step 2: Test Frontend Locally (5 minutes)

Open `frontend/index.html` in browser or use Live Server.

If backend is running on `localhost:5000`, it should auto-detect.

---

## Step 3: Deploy Backend to Render.com (15 minutes)

### 1. Create Render Account
- Go to https://render.com
- Sign up with GitHub

### 2. Connect Repository
- In Render dashboard, click "New +" → "Web Service"
- Connect your GitHub repository

### 3. Configure Service
- **Name**: `smart-city-backend`
- **Runtime**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Free (initially)

### 4. Set Environment Variables
Click "Environment" and add:
```
MONGO_URI=mongodb+srv://smart_complaint_system:student@cluster0.lxlllrq.mongodb.net/smart-city-issue-reporting
JWT_SECRET=xY7kL!9qZgpR2mBa
ADMIN_SECRET_KEY=smart-city-init
FRONTEND_URL=[Will update after frontend deploy]
NODE_ENV=production
```

### 5. Deploy
- Click "Create Web Service"
- Wait 5-10 minutes for deployment
- Copy the URL (e.g., `https://smart-city-backend-xxxxx.onrender.com`)

### 6. Verify Backend
```
https://smart-city-backend-xxxxx.onrender.com/api/health
```

Should return `{"status":"healthy","db":"connected"}`

---

## Step 4: Deploy Frontend to Netlify (10 minutes)

### 1. Create Netlify Account
- Go to https://netlify.com
- Sign up with GitHub

### 2. Create New Site
- Click "Add new site" → "Import an existing project"
- Select your GitHub repo
- Configure:
  - **Base directory**: `frontend`
  - **Publish directory**: (leave empty — Netlify serves all files)
  - **Build command**: (leave empty — no build step needed)

### 3. Update netlify.toml
The file already exists with redirects. Verify:
```toml
[[redirects]]
  from = "/api/*"
  to = "https://smart-city-backend-xxxxx.onrender.com/api/:splat"
  status = 200
```

Replace `smart-city-backend-xxxxx.onrender.com` with your actual Render URL.

### 4. Deploy
- Click "Deploy site"
- Wait 2-3 minutes
- Copy site URL (e.g., `https://smart-city-xxxxxx.netlify.app`)

### 5. Update Backend CORS
Go to Render dashboard → Environment variables:
- Update `FRONTEND_URL=https://smart-city-xxxxxx.netlify.app`
- Service auto-redeploys

---

## Step 5: Verify Everything Works

### Test in Browser
1. Go to `https://smart-city-xxxxxx.netlify.app`
2. Try submitting a complaint
3. Check `/admin.html` login works
4. Verify images upload and display

### Test API Directly
```bash
# Health check
curl https://smart-city-backend-xxxxx.onrender.com/api/health

# Get complaints
curl https://smart-city-backend-xxxxx.onrender.com/api/complaints

# Get stats
curl https://smart-city-backend-xxxxx.onrender.com/api/analytics/stats
```

---

## Troubleshooting

### "Failed to load" error
- Check browser console (F12 → Console tab)
- Verify `netlify.toml` redirects to correct backend URL
- Verify FRONTEND_URL is set in Render environment

### Backend won't deploy
- Check build logs in Render dashboard
- Ensure `backend/package.json` has `"start": "node server.js"`
- Verify `MONGO_URI` is correct (MongoDB Atlas connection string)

### Uploads not showing
- Verify `/uploads/*` redirect in `netlify.toml`
- Check that files exist in `backend/uploads/`

### CORS errors
- Verify `FRONTEND_URL` matches your Netlify URL exactly
- Check backend console for CORS logs

---

## Summary

| Step | Platform | Time | Status |
|------|----------|------|--------|
| Backend deployment | Render | 15 min | ⬜ |
| Frontend deployment | Netlify | 10 min | ⬜ |
| Environment setup | Both | 5 min | ⬜ |
| Testing | Browser | 5 min | ⬜ |

**Total time: ~35 minutes**

After deployment, your site will be live at:
```
https://smart-city-xxxxxx.netlify.app
```

Backend API at:
```
https://smart-city-backend-xxxxx.onrender.com/api
```
