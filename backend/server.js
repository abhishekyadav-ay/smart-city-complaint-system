const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
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
    // Allow file:// (origin null) and same-machine development hosts on any port.
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
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

// ❤️ Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
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

// 🚀 Start Server
const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});