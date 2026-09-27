import mongoose from 'mongoose';

const trainServiceSchema = new mongoose.Schema(
  {
    serviceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    serviceName: {
      type: String,
      required: true
    },
    origin: {
      type: String,
      required: true
    },
    destination: {
      type: String,
      required: true
    },
    scheduledDeparture: {
      type: String,
      required: true
    },
    scheduledArrival: {
      type: String,
      required: true
    },
    assignedLocomotive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Locomotive'
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'ASSIGNED', 'DEPARTED', 'CANCELLED'],
      default: 'SCHEDULED'
    },
    routeType: {
      type: String,
      enum: ['SUPERFAST', 'EXPRESS', 'FREIGHT', 'PASSENGER'],
      default: 'SUPERFAST'
    }
  },
  {
    timestamps: true
  }
);

export const TrainService = mongoose.model('TrainService', trainServiceSchema);
