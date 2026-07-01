const express = require('express');
const router = express.Router();
const {
  login,
  createAdmin,
  verifyToken,
  listAdmins,
  createStaffAdmin,
  resetAdminPassword,
  toggleAdminStatus,
} = require('../controllers/authController');
const auth = require('../middleware/auth');
const superAdmin = require('../middleware/superAdmin');

router.post('/login', login);
router.post('/register', createAdmin);
router.get('/verify', auth, verifyToken);

router.get('/admins', auth, superAdmin, listAdmins);
router.post('/admins', auth, superAdmin, createStaffAdmin);
router.put('/admins/:id/password', auth, superAdmin, resetAdminPassword);
router.patch('/admins/:id/status', auth, superAdmin, toggleAdminStatus);

module.exports = router;
