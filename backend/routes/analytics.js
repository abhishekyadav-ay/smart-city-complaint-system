const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getAnalytics, getPublicAnalytics } = require('../controllers/analyticsController');

// Public analytics route
router.get('/public', getPublicAnalytics);

// GET /api/analytics (admin protected)
router.get('/', auth, getAnalytics);

module.exports = router;
