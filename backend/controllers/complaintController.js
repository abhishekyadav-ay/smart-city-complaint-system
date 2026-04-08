const Complaint = require('../models/Complaint');
const { categorizeIssue } = require('../utils/aiCategorize');
const { sendResolutionEmail, sendStatusUpdateEmail } = require('../utils/sendEmail');
const fs = require('fs');
const path = require('path');

// POST /api/complaints — Submit new complaint (public)
exports.submitComplaint = async (req, res) => {
  try {
    const { name, email, address, lat, lng, description } = req.body;

    if (!name || !email || !address || !description) {
      return res.status(400).json({ message: 'Name, email, address, and description are required' });
    }

    // Generate unique tracking ID
    const trackingId = 'SC' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();

    // AI categorization
    const { category, confidence, method } = await categorizeIssue(description);

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const complaint = new Complaint({
      trackingId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      location: {
        address: address.trim(),
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
      },
      issueType: category,
      description: description.trim(),
      image: imagePath,
      aiConfidence: confidence,
    });

    await complaint.save();

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully! We will look into it shortly.',
      complaint: {
        id: complaint._id,
        trackingId: complaint.trackingId,
        issueType: complaint.issueType,
        status: complaint.status,
        aiMethod: method,
      },
    });
  } catch (err) {
    console.error('Submit complaint error:', err);
    // Clean up uploaded file if complaint save failed
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ message: 'Failed to submit complaint. Please try again.' });
  }
};

// GET /api/complaints/public/recent — Get recent complaints (public)
exports.getPublicComplaints = async (req, res) => {
  try {
    const { limit = 9, sort = '-createdAt' } = req.query;
    
    const complaints = await Complaint.find()
      .sort(sort)
      .limit(parseInt(limit))
      .lean();

    // Remove sensitive info from public view
    const publicComplaints = complaints.map(complaint => ({
      id: complaint._id,
      name: complaint.name,
      issueType: complaint.issueType || complaint.category,
      description: complaint.description,
      address: complaint.location?.address || complaint.address,
      status: complaint.status,
      createdAt: complaint.createdAt,
      image: complaint.image,
    }));

    res.json({
      success: true,
      complaints: publicComplaints,
      total: publicComplaints.length,
    });
  } catch (err) {
    console.error('Get public complaints error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
  }
};

// GET /api/complaints — Get all complaints (admin)
exports.getAllComplaints = async (req, res) => {
  try {
    const { status, issueType, page = 1, limit = 20, search } = req.query;
    const filter = {};

    if (status && status !== 'All') filter.status = status;
    if (issueType && issueType !== 'All') filter.issueType = issueType;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Complaint.countDocuments(filter);
    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      complaints,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Get complaints error:', err);
    res.status(500).json({ message: 'Failed to fetch complaints' });
  }
};

// GET /api/complaints/:id — Get single complaint (admin)
exports.getComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch complaint' });
  }
};

// GET /api/complaints/track/:trackingId — Track complaint by tracking ID (public)
exports.trackComplaint = async (req, res) => {
  try {
    const { trackingId } = req.params;

    const complaint = await Complaint.findOne({ trackingId: trackingId.toUpperCase() });
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found. Please check your tracking ID.' });
    }

    res.json({
      success: true,
      complaint: {
        trackingId: complaint.trackingId,
        name: complaint.name,
        email: complaint.email,
        issueType: complaint.issueType,
        description: complaint.description,
        address: complaint.location?.address,
        status: complaint.status,
        createdAt: complaint.createdAt,
        resolvedAt: complaint.resolvedAt,
        adminNotes: complaint.adminNotes,
        image: complaint.image,
      },
    });
  } catch (err) {
    console.error('Track complaint error:', err);
    res.status(500).json({ message: 'Failed to track complaint' });
  }
};

// GET /api/complaints/track/email/:email — Track complaints by email (public)
exports.trackComplaintsByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    const complaints = await Complaint.find({ email: email.toLowerCase() })
      .sort({ createdAt: -1 })
      .lean();

    if (complaints.length === 0) {
      return res.status(404).json({ message: 'No complaints found for this email address.' });
    }

    const publicComplaints = complaints.map(complaint => ({
      trackingId: complaint.trackingId,
      issueType: complaint.issueType,
      description: complaint.description,
      address: complaint.location?.address,
      status: complaint.status,
      createdAt: complaint.createdAt,
      resolvedAt: complaint.resolvedAt,
      adminNotes: complaint.adminNotes,
    }));

    res.json({
      success: true,
      complaints: publicComplaints,
    });
  } catch (err) {
    console.error('Track complaints by email error:', err);
    res.status(500).json({ message: 'Failed to track complaints' });
  }
};

// PUT /api/complaints/:id/status — Update complaint status (admin)
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const validStatuses = ['Pending', 'In Progress', 'Resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updateData = { status };
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (status === 'Resolved') updateData.resolvedAt = new Date();

    const complaint = await Complaint.findByIdAndUpdate(id, updateData, { new: true });
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Send email notifications
    if (status === 'Resolved') {
      await sendResolutionEmail(
        complaint.email,
        complaint.name,
        complaint.issueType,
        complaint._id,
        adminNotes || ''
      );
    } else if (status === 'In Progress') {
      await sendStatusUpdateEmail(
        complaint.email,
        complaint.name,
        complaint.issueType,
        status,
        complaint._id
      );
    }

    res.json({
      success: true,
      message: `Status updated to "${status}"`,
      complaint,
    });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ message: 'Failed to update status' });
  }
};

// DELETE /api/complaints/:id — Delete complaint (admin)
exports.deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Delete associated image file
    if (complaint.image) {
      const imgPath = path.join(__dirname, '..', complaint.image);
      fs.unlink(imgPath, (err) => {
        if (err) console.warn('Could not delete image file:', err.message);
      });
    }

    res.json({ success: true, message: 'Complaint deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete complaint' });
  }
};

// GET /api/complaints/track/:trackingId — Track complaint by tracking ID (public)
exports.trackComplaint = async (req, res) => {
  try {
    const { trackingId } = req.params;

    const complaint = await Complaint.findOne({ trackingId: trackingId.toUpperCase() });
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found. Please check your tracking ID.' });
    }

    res.json({
      success: true,
      complaint: {
        trackingId: complaint.trackingId,
        name: complaint.name,
        email: complaint.email,
        issueType: complaint.issueType,
        description: complaint.description,
        address: complaint.location?.address,
        status: complaint.status,
        createdAt: complaint.createdAt,
        resolvedAt: complaint.resolvedAt,
        adminNotes: complaint.adminNotes,
        image: complaint.image,
      },
    });
  } catch (err) {
    console.error('Track complaint error:', err);
    res.status(500).json({ message: 'Failed to track complaint' });
  }
};

// GET /api/complaints/track/email/:email — Track complaints by email (public)
exports.trackComplaintsByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    const complaints = await Complaint.find({ email: email.toLowerCase() })
      .sort({ createdAt: -1 })
      .lean();

    if (complaints.length === 0) {
      return res.status(404).json({ message: 'No complaints found for this email address.' });
    }

    const publicComplaints = complaints.map(complaint => ({
      trackingId: complaint.trackingId,
      issueType: complaint.issueType,
      description: complaint.description,
      address: complaint.location?.address,
      status: complaint.status,
      createdAt: complaint.createdAt,
      resolvedAt: complaint.resolvedAt,
      adminNotes: complaint.adminNotes,
    }));

    res.json({
      success: true,
      complaints: publicComplaints,
    });
  } catch (err) {
    console.error('Track complaints by email error:', err);
    res.status(500).json({ message: 'Failed to track complaints' });
  }
};
