import mongoose from 'mongoose';

const maintenanceTaskSchema = new mongoose.Schema(
  {
    taskNumber: {
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
    defect: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Defect'
    },
    title: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['Mechanical', 'Electrical', 'Brake', 'Safety', 'Cab', 'Preventive', 'Overhaul'],
      default: 'Mechanical'
    },
    description: {
      type: String,
      required: true
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM'
    },
    status: {
      type: String,
      enum: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'VERIFICATION_REQUIRED', 'COMPLETED'],
      default: 'PENDING',
      index: true
    },
    startDate: {
      type: Date
    },
    dueDate: {
      type: Date
    },
    completedDate: {
      type: Date
    },
    notes: {
      type: String
    },
    resolutionSummary: {
      type: String
    },
    attachments: [
      {
        type: String
      }
    ],
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

export const MaintenanceTask = mongoose.model('MaintenanceTask', maintenanceTaskSchema);
