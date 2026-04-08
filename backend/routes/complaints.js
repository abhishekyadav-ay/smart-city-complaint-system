const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const complaintController = require('../controllers/complaintController');

// Public routes
router.post('/', upload.single('image'), complaintController.submitComplaint);
router.get('/public/recent', complaintController.getPublicComplaints);
router.get('/track/:trackingId', complaintController.trackComplaint);
router.get('/track/email/:email', complaintController.trackComplaintsByEmail);

// Admin protected routes
router.get('/', auth, complaintController.getAllComplaints);
router.get('/:id', auth, complaintController.getComplaint);
router.put('/:id/status', auth, complaintController.updateStatus);
router.delete('/:id', auth, complaintController.deleteComplaint);

module.exports = router;
