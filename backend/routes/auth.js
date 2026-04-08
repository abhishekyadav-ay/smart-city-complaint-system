const express = require('express');
const router = express.Router();
const { login, createAdmin, verifyToken } = require('../controllers/authController');
const auth = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/register (protected by secret key in body)
router.post('/register', createAdmin);

// GET /api/auth/verify (JWT protected)
router.get('/verify', auth, verifyToken);

module.exports = router;
