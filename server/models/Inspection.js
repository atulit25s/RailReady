import mongoose from 'mongoose';

const inspectionItemSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['Mechanical', 'Electrical', 'Safety', 'Cab'],
    required: true
  },
  itemTitle: {
    type: String,
    required: true
  },
  result: {
    type: String,
    enum: ['PASS', 'FAIL', 'REQUIRES_ATTENTION', 'NOT_APPLICABLE', 'PENDING'],
    default: 'PENDING'
  },
  comment: {
    type: String,
    default: ''
  },
  photoUrl: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const inspectionSchema = new mongoose.Schema(
  {
    inspectionNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    locomotive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Locomotive',
      required: true,
      index: true
    },
    inspector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InspectionTemplate'
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true
    },
    items: [inspectionItemSchema],
    submissionNotes: {
      type: String
    },
    supervisorFeedback: {
      type: String
    },
    submittedAt: {
      type: Date
    },
    reviewedAt: {
      type: Date
    },
    auditHistory: [
      {
        status: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedAt: { type: Date, default: Date.now },
        notes: String
      }
    ]
  },
  {
    timestamps: true
  }
);

export const Inspection = mongoose.model('Inspection', inspectionSchema);
