import mongoose from 'mongoose';

const locomotiveSchema = new mongoose.Schema(
  {
    locoNumber: {
      type: String,
      required: [true, 'Locomotive number is required'],
      unique: true,
      trim: true,
      index: true
    },
    locoClass: {
      type: String,
      required: [true, 'Locomotive class is required'],
      enum: ['WAP-7', 'WAG-9', 'WAP-5', 'WAG-12B', 'WDG-4G', 'WDM-3D', 'WAP-4', 'WAG-7'],
      default: 'WAP-7'
    },
    shed: {
      type: String,
      required: true,
      default: 'Central Locomotive Shed - Kalyan (ELS)'
    },
    manufacturer: {
      type: String,
      default: 'Chittaranjan Locomotive Works (CLW)'
    },
    commissioningDate: {
      type: Date,
      default: () => new Date('2021-04-15')
    },
    status: {
      type: String,
      enum: [
        'READY',
        'INSPECTION_PENDING',
        'UNDER_MAINTENANCE',
        'AWAITING_REVIEW',
        'REQUIRES_ATTENTION',
        'OUT_OF_SERVICE'
      ],
      default: 'INSPECTION_PENDING',
      index: true
    },
    currentLocation: {
      type: String,
      default: 'Bay 3 - Inspection Pit'
    },
    lastInspectionDate: {
      type: Date
    },
    nextInspectionDate: {
      type: Date
    },
    lastMaintenanceDate: {
      type: Date
    },
    currentAssignment: {
      type: String,
      default: 'None'
    },
    mileageKm: {
      type: Number,
      default: 125400
    },
    notes: {
      type: String,
      default: 'Standard electric locomotive in active fleet rotation.'
    },
    qrCodeData: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

export const Locomotive = mongoose.model('Locomotive', locomotiveSchema);
