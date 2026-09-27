import mongoose from 'mongoose';

const inspectionItemTemplateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Mechanical', 'Electrical', 'Safety', 'Cab'],
    required: true
  },
  description: {
    type: String
  },
  isRequired: {
    type: Boolean,
    default: true
  }
});

const inspectionTemplateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      default: 'Standard Pre-Deployment Locomotive Checklist (ELS-STD-2026)'
    },
    version: {
      type: String,
      default: 'v2.4'
    },
    isDefault: {
      type: Boolean,
      default: true
    },
    items: [inspectionItemTemplateSchema]
  },
  {
    timestamps: true
  }
);

export const InspectionTemplate = mongoose.model('InspectionTemplate', inspectionTemplateSchema);
