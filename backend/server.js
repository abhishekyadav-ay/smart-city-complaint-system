const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();
const { verifyEmailConnection } = require('./utils/sendEmail');

const connectDB = require('./config/db');

const app = express();

// 🔥 Connect MongoDB
connectDB();

// 🔐 Security Middleware
app.use(helmet());

// 🔥 CORS (IMPORTANT for frontend connection)
app.use(cors({
  origin: (origin, callback) => {
    const configuredOrigins = [
      process.env.FRONTEND_URL,
      ...(process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    ];

    const isLocalDev = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
    const isConfigured = configuredOrigins.includes(origin);

    // Allow file:// (origin null), local dev, and configured production origins.
    if (!origin || isLocalDev || isConfigured) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true
}));

// 🔥 Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📁 Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🧠 Logger (for debugging)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// 🚀 Routes
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/analytics', require('./routes/analytics'));

// ❤️ Health Check API (always 200 so platforms like Render mark deploy healthy; check `db` for MongoDB)
app.get('/api/health', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    db: dbReady ? 'connected' : 'disconnected',
    time: new Date()
  });
});

// 📧 Email Health Check
app.get('/api/health/email', async (req, res) => {
  const result = await verifyEmailConnection();
  res.status(result.ok ? 200 : 503).json(result);
});

// ❌ 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ⚠️ Global Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.message);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 🚀 Start Server (bind all interfaces — required for Render and similar hosts)
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});