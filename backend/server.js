  const express = require('express');
  const cors = require('cors');
  const helmet = require('helmet');
  const path = require('path');
  const mongoose = require('mongoose');
  const rateLimit = require('express-rate-limit');
  require('dotenv').config();

  const connectDB = require('./config/db');
  const { verifyEmailConnection } = require('./utils/sendEmail');

  const ensureRequiredEnv = () => {
    const required = ['MONGO_URI', 'JWT_SECRET'];
    const missing = required.filter((key) => !process.env[key] || !process.env[key].trim());

    if (missing.length) {
      console.error(`Missing required environment variable(s): ${missing.join(', ')}`);
      process.exit(1);
    }

    if (!process.env.ADMIN_SECRET_KEY) {
      console.warn('ADMIN_SECRET_KEY is not configured. Admin registration routes are disabled until it is set.');
    }

    if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
      console.warn('FRONTEND_URL is not configured. Set this to your deployed frontend URL for CORS validation.');
    }
  };

  ensureRequiredEnv();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  });

  app.use('/api/', apiLimiter);
  connectDB();
  app.use(helmet());

  const configuredOrigins = new Set(
    [process.env.FRONTEND_URL, ...(process.env.ALLOWED_ORIGINS || '').split(',')]
      .map((origin) => (origin || '').trim())
      .filter(Boolean)
  );

  app.use(cors({
    origin: (origin, callback) => {
      const isLocalDev = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
      const isConfigured = origin ? configuredOrigins.has(origin) : false;

      if (!origin || isLocalDev || isConfigured) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 204,
  }));

  if (process.env.USE_S3 === 'true') {
    console.log('Uploads configured to use S3 (USE_S3=true)');
  }

  app.options('*', cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  app.use('/api/complaints', require('./routes/complaints'));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/analytics', require('./routes/analytics'));

  app.get('/api/health', (req, res) => {
    const dbReady = mongoose.connection.readyState === 1;
    res.status(200).json({
      status: 'OK',
      message: 'Server is running',
      db: dbReady ? 'connected' : 'disconnected',
      time: new Date(),
    });
  });

  app.get('/api/health/email', async (req, res) => {
    const result = await verifyEmailConnection();
    res.status(result.ok ? 200 : 503).json(result);
  });

  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Internal Server Error',
    });
  });

  const PORT = Number(process.env.PORT) || 5000;
  const HOST = process.env.HOST || '0.0.0.0';

  const startServer = () => {
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    });
  };

  if (require.main === module) {
    startServer();
  }

  module.exports = { app, startServer };