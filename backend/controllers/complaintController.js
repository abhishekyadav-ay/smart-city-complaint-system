const Complaint = require('../models/Complaint');
const generateTrackingId = require('../utils/generateTrackingID');
const {
  sendComplaintReceivedEmail,
  sendResolutionEmail,
  sendStatusUpdateEmail
} = require('../utils/sendEmail');

// CREATE
exports.createComplaint = async (req, res, next) => {
  try {
    const trackingId = generateTrackingId();
    const lat = req.body.lat !== undefined && req.body.lat !== '' ? Number(req.body.lat) : undefined;
    const lng = req.body.lng !== undefined && req.body.lng !== '' ? Number(req.body.lng) : undefined;

    let aiDetectedIssues = [];
    if (req.body.aiCategories) {
      try {
        const parsed = JSON.parse(req.body.aiCategories);
        if (Array.isArray(parsed)) {
          aiDetectedIssues = parsed
            .filter((item) => item && item.issueType)
            .map((item, idx) => ({
              issueType: item.issueType,
              score: Number(item.score) || 0,
              priority: Number(item.priority) || idx + 1
            }));
        }
      } catch (e) {
        // Ignore malformed client metadata and proceed.
      }
    }

    const complaintPayload = {
      trackingId,
      name: req.body.name,
      email: req.body.email,
      issueType: req.body.issueType || 'Others',
      description: req.body.description,
      location: {
        address: req.body.address || '',
        lat: Number.isFinite(lat) ? lat : undefined,
        lng: Number.isFinite(lng) ? lng : undefined
      },
      aiDetectedIssues
    };

    if (aiDetectedIssues.length > 0) {
      complaintPayload.aiConfidence = aiDetectedIssues[0].score;
    }

    if (req.file) {
      complaintPayload.image = `/uploads/${req.file.filename}`;
    }

    const complaint = await Complaint.create(complaintPayload);

    // Notify user without blocking API response on email failure.
    sendComplaintReceivedEmail(complaint.email, complaint.name, complaint.issueType, complaint.trackingId)
      .catch(() => {});

    res.status(201).json({
      success: true,
      data: complaint
    });
  } catch (err) {
    next(err);
  }
};

// GET ALL
exports.getComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: complaints.length,
      data: complaints
    });
  } catch (err) {
    next(err);
  }
};

// GET ONE
exports.getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    res.json({
      success: true,
      data: complaint
    });
  } catch (err) {
    next(err);
  }
};

// UPDATE STATUS
exports.updateStatus = async (req, res, next) => {
  try {
    const updatePayload = { status: req.body.status };
    if (typeof req.body.adminNotes === 'string') {
      updatePayload.adminNotes = req.body.adminNotes;
    }
    if (req.body.status === 'Resolved') {
      updatePayload.resolvedAt = new Date();
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true }
    );

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Notify user whenever admin updates complaint status/notes.
    const notes = typeof updatePayload.adminNotes === 'string' ? updatePayload.adminNotes : complaint.adminNotes;
    if (complaint.status === 'Resolved') {
      sendResolutionEmail(
        complaint.email,
        complaint.name,
        complaint.issueType,
        complaint._id,
        notes || ''
      ).catch(() => {});
    } else {
      sendStatusUpdateEmail(
        complaint.email,
        complaint.name,
        complaint.issueType,
        complaint.status,
        complaint._id,
        notes || ''
      ).catch(() => {});
    }

    res.json({
      success: true,
      data: complaint
    });
  } catch (err) {
    next(err);
  }
};

// DELETE
exports.deleteComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    res.json({
      success: true,
      message: 'Complaint deleted'
    });
  } catch (err) {
    next(err);
  }
};