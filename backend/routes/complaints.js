const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');

const {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateStatus,
  deleteComplaint
} = require('../controllers/complaintController');

// Routes
router.post('/', upload.single('image'), createComplaint);
router.get('/', getComplaints);
router.get('/:id', getComplaintById);
router.put('/:id', updateStatus);
router.put('/:id/status', updateStatus);
router.delete('/:id', deleteComplaint);

module.exports = router;