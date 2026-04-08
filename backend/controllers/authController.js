require('dotenv').config();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET || 'smart-city-default-jwt-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      username: admin.username,
      message: 'Login successful',
    });
  } catch (err) {
    console.error('Login error:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ message: 'Server error during login', error: err.message });
  }
};

// POST /api/auth/register (seed admin — protect in production)
exports.createAdmin = async (req, res) => {
  try {
    const { username, password, secretKey } = req.body;

    // Simple secret key guard
    if (secretKey !== process.env.ADMIN_SECRET_KEY && secretKey !== 'smart-city-init') {
      return res.status(403).json({ message: 'Unauthorized to create admin' });
    }

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await Admin.findOne({ username: username.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Admin with this username already exists' });
    }

    const admin = new Admin({ username, password });
    await admin.save();

    res.status(201).json({ success: true, message: 'Admin account created successfully' });
  } catch (err) {
    console.error('Create admin error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/auth/verify
exports.verifyToken = (req, res) => {
  res.json({ valid: true, admin: req.admin });
};
