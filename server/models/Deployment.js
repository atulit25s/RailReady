import mongoose from 'mongoose';

const deploymentSchema = new mongoose.Schema(
  {
    deploymentNumber: {
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
    trainService: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TrainService',
      required: true
    },
    departureDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    departureTime: {
      type: String,
      required: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readinessSnapshot: {
      calculatedStatus: { type: String, default: 'READY' },
      inspectionValid: { type: Boolean, default: true },
      openCriticalDefects: { type: Number, default: 0 },
      openHighDefects: { type: Number, default: 0 },
      pendingUrgentMaintenance: { type: Number, default: 0 },
      supervisorApproved: { type: Boolean, default: true },
      evaluatedAt: { type: Date, default: Date.now }
    },
    status: {
      type: String,
      enum: ['CONFIRMED', 'DISPATCHED', 'COMPLETED', 'CANCELLED'],
      default: 'CONFIRMED',
      index: true
    },
    notes: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

export const Deployment = mongoose.model('Deployment', deploymentSchema);
