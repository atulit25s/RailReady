import mongoose from 'mongoose';

const defectSchema = new mongoose.Schema(
  {
    defectNumber: {
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
    inspection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inspection'
    },
    category: {
      type: String,
      enum: ['Mechanical', 'Electrical', 'Brake', 'Safety', 'Cab', 'Other'],
      required: true
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
      index: true
    },
    description: {
      type: String,
      required: true
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reportedDate: {
      type: Date,
      default: Date.now
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_VERIFICATION', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true
    },
    photos: [
      {
        type: String
      }
    ],
    resolutionNotes: {
      type: String
    },
    resolvedAt: {
      type: Date
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

export const Defect = mongoose.model('Defect', defectSchema);
