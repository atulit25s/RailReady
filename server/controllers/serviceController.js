import { TrainService } from '../models/TrainService.js';
import { Locomotive } from '../models/Locomotive.js';
import { logAction } from '../services/auditService.js';

// @desc    Get all train services
// @route   GET /api/services
// @access  Private
export const getTrainServices = async (req, res, next) => {
  try {
    const { status, routeType, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (routeType) query.routeType = routeType;
    if (search) {
      query.$or = [
        { serviceNumber: new RegExp(search, 'i') },
        { serviceName: new RegExp(search, 'i') },
        { origin: new RegExp(search, 'i') },
        { destination: new RegExp(search, 'i') }
      ];
    }

    const services = await TrainService.find(query)
      .populate('assignedLocomotive', 'locoNumber locoClass status shed')
      .sort({ serviceNumber: 1 });

    res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single train service
// @route   GET /api/services/:id
// @access  Private
export const getTrainServiceById = async (req, res, next) => {
  try {
    const service = await TrainService.findById(req.params.id).populate('assignedLocomotive');
    if (!service) {
      return res.status(404).json({ success: false, error: 'Train service not found' });
    }
    res.status(200).json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new train service
// @route   POST /api/services
// @access  Private (Manager / Admin)
export const createTrainService = async (req, res, next) => {
  try {
    const {
      serviceNumber,
      serviceName,
      origin,
      destination,
      scheduledDeparture,
      scheduledArrival,
      routeType
    } = req.body;

    const exists = await TrainService.findOne({ serviceNumber });
    if (exists) {
      return res.status(400).json({ success: false, error: `Service #${serviceNumber} already exists` });
    }

    const service = await TrainService.create({
      serviceNumber,
      serviceName,
      origin,
      destination,
      scheduledDeparture,
      scheduledArrival,
      routeType: routeType || 'SUPERFAST',
      status: 'SCHEDULED'
    });

    await logAction({
      user: req.user._id,
      action: 'TRAIN_SERVICE_CREATED',
      entityType: 'TrainService',
      entityId: service._id,
      description: `Created service ${serviceNumber} - ${serviceName} (${origin} -> ${destination})`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
};
