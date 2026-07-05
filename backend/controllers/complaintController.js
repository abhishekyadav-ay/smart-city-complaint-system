const Complaint = require('../models/Complaint');
const generateTrackingId = require('../utils/generateTrackingID');
const { categorizeIssue } = require('../utils/aiCategorize');
const {
  sendComplaintReceivedEmail,
  sendAdminNewComplaintEmail,
  sendResolutionEmail,
  sendStatusUpdateEmail,
} = require('../utils/sendEmail');

const sanitizePublicComplaint = (complaint) => ({
  _id: complaint._id,
  trackingId: complaint.trackingId,
  name: complaint.name,
  issueType: complaint.issueType,
  description: complaint.description,
  status: complaint.status,
  address: complaint.location?.address || '',
  adminNotes: complaint.adminNotes,
  createdAt: complaint.createdAt,
});

const parseAiCategories = (rawValue) => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item && item.issueType)
      .map((item, index) => ({
        issueType: item.issueType,
        score: Number(item.score) || 0,
        priority: Number(item.priority) || index + 1,
      }));
  } catch {
    return [];
  }
};

exports.createComplaint = async (req, res, next) => {
  try {
    const trackingId = generateTrackingId();
    const lat = req.body.lat !== undefined && req.body.lat !== '' ? Number(req.body.lat) : undefined;
    const lng = req.body.lng !== undefined && req.body.lng !== '' ? Number(req.body.lng) : undefined;

    let aiDetectedIssues = parseAiCategories(req.body.aiCategories);
    let issueType = req.body.issueType;
    let aiConfidence;

    if (!issueType && req.body.description) {
      const aiResult = await categorizeIssue(req.body.description);
      issueType = aiResult.category;
      aiConfidence = aiResult.confidence;

      if (aiDetectedIssues.length === 0) {
        aiDetectedIssues = [{ issueType, score: aiConfidence, priority: 1 }];
      }
    }

    const complaintPayload = {
      trackingId,
      name: req.body.name,
      email: req.body.email,
      issueType: issueType || 'Others',
      description: req.body.description,
      location: {
        address: req.body.address || '',
        lat: Number.isFinite(lat) ? lat : undefined,
        lng: Number.isFinite(lng) ? lng : undefined,
      },
      aiDetectedIssues,
    };

    if (aiDetectedIssues.length > 0) {
      complaintPayload.aiConfidence = aiDetectedIssues[0].score;
    } else if (aiConfidence != null) {
      complaintPayload.aiConfidence = aiConfidence;
    }

    if (req.file) {
      complaintPayload.image = `/uploads/${req.file.filename}`;
    }

    const complaint = await Complaint.create(complaintPayload);

    sendComplaintReceivedEmail(complaint.email, complaint.name, complaint.issueType, complaint.trackingId).catch(() => {});

    if (process.env.ADMIN_EMAIL) {
      sendAdminNewComplaintEmail(process.env.ADMIN_EMAIL, complaint).catch(() => {});
    }

    res.status(201).json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
};

exports.getComplaints = async (req, res, next) => {
  try {
    const isAdmin = Boolean(req.admin);
    const { status, issueType, search } = req.query;
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const defaultLimit = isAdmin ? 20 : 9;
    const maxLimit = isAdmin ? 100 : 20;
    const limitNum = Math.min(maxLimit, parseInt(req.query.limit, 10) || defaultLimit);
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (status) query.status = status;
    if (issueType) query.issueType = issueType;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
        { trackingId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Complaint.countDocuments(query),
    ]);

    const data = isAdmin ? complaints : complaints.map((complaint) => sanitizePublicComplaint(complaint));

    res.json({
      success: true,
      count: data.length,
      total,
      page: pageNum,
      pages: Math.max(1, Math.ceil(total / limitNum)),
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.trackById = async (req, res, next) => {
  try {
    const trackingId = String(req.params.trackingId || '').trim().toUpperCase();
    if (!trackingId) {
      return res.status(400).json({ success: false, message: 'Tracking ID is required' });
    }

    const complaint = await Complaint.findOne({ trackingId });
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    res.json({ success: true, data: [sanitizePublicComplaint(complaint)] });
  } catch (err) {
    next(err);
  }
};

exports.trackByEmail = async (req, res, next) => {
  try {
    const email = String(req.params.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const complaints = await Complaint.find({ email }).sort({ createdAt: -1 });
    if (!complaints.length) {
      return res.status(404).json({ success: false, message: 'No complaints found' });
    }

    res.json({ success: true, data: complaints.map((complaint) => sanitizePublicComplaint(complaint)) });
  } catch (err) {
    next(err);
  }
};

exports.getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    res.json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const updatePayload = { status: req.body.status };
    if (typeof req.body.adminNotes === 'string') {
      updatePayload.adminNotes = req.body.adminNotes;
    }
    if (req.body.status === 'Resolved') {
      updatePayload.resolvedAt = new Date();
    }

    const complaint = await Complaint.findByIdAndUpdate(req.params.id, updatePayload, { new: true });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const notes = typeof updatePayload.adminNotes === 'string' ? updatePayload.adminNotes : complaint.adminNotes;

    if (complaint.status === 'Resolved') {
      sendResolutionEmail(complaint.email, complaint.name, complaint.issueType, complaint._id, notes || '').catch(() => {});
    } else {
      sendStatusUpdateEmail(complaint.email, complaint.name, complaint.issueType, complaint.status, complaint._id, notes || '').catch(() => {});
    }

    res.json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
};

exports.deleteComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    res.json({ success: true, message: 'Complaint deleted' });
  } catch (err) {
    next(err);
  }
};
