const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    trackingId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    location: {
      address: { type: String, required: [true, 'Address is required'] },
      lat: { type: Number },
      lng: { type: Number },
    },
    issueType: {
      type: String,
      enum: ['Pothole', 'Garbage', 'Streetlight', 'Water Issue', 'Others'],
      default: 'Others',
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      minlength: [10, 'Description must be at least 10 characters'],
    },
    image: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved'],
      default: 'Pending',
    },
    aiConfidence: {
      type: Number,
      default: null,
    },
    adminNotes: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for faster queries
complaintSchema.index({ status: 1 });
complaintSchema.index({ issueType: 1 });
complaintSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
