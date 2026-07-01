const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    trackingId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },

    location: {
      address: String,
      lat: Number,
      lng: Number
    },

    issueType: {
      type: String,
      enum: ['Pothole', 'Garbage', 'Streetlight', 'Water Issue', 'Others'],
      default: 'Others'
    },

    description: { type: String, required: true },

    image: String,

    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved'],
      default: 'Pending'
    },

    aiConfidence: Number,
    aiDetectedIssues: [
      {
        issueType: {
          type: String,
          enum: ['Pothole', 'Garbage', 'Streetlight', 'Water Issue', 'Others']
        },
        score: Number,
        priority: Number
      }
    ],
    adminNotes: String,
    resolvedAt: Date
  },
  { timestamps: true }
);

complaintSchema.virtual('address').get(function () {
  return this.location?.address || '';
});

complaintSchema.set('toJSON', { virtuals: true });
complaintSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Complaint', complaintSchema);