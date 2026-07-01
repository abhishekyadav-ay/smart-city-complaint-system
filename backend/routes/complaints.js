const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');

const {
  createComplaint,
  getComplaints,
  trackById,
  trackByEmail,
  getComplaintById,
  updateStatus,
  deleteComplaint
} = require('../controllers/complaintController');

router.post('/', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, createComplaint);
router.get('/track/:trackingId', trackById);
router.get('/track/email/:email', trackByEmail);
router.get('/', optionalAuth, getComplaints);
router.get('/:id', auth, getComplaintById);
router.put('/:id/status', auth, updateStatus);
router.put('/:id', auth, updateStatus);
router.delete('/:id', auth, deleteComplaint);

module.exports = router;
