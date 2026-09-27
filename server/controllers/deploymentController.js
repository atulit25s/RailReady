import { Deployment } from '../models/Deployment.js';
import { Locomotive } from '../models/Locomotive.js';
import { TrainService } from '../models/TrainService.js';
import { evaluateLocomotiveReadiness } from '../services/readinessService.js';
import { logAction } from '../services/auditService.js';
import { createNotification } from '../services/socketService.js';

// @desc    Get all deployment records
// @route   GET /api/deployments
// @access  Private
export const getDeployments = async (req, res, next) => {
  try {
    const { status, locomotiveId, serviceId, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (locomotiveId) query.locomotive = locomotiveId;
    if (serviceId) query.trainService = serviceId;

    const total = await Deployment.countDocuments(query);
    const deployments = await Deployment.find(query)
      .populate('locomotive', 'locoNumber locoClass status shed currentLocation')
      .populate('trainService')
      .populate('assignedBy', 'name email role')
      .sort({ departureDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: deployments.length,
      total,
      data: deployments
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Assign locomotive to service (with Strict Pre-Deployment Readiness Check)
// @route   POST /api/deployments
// @access  Private (Manager / Admin)
export const createDeployment = async (req, res, next) => {
  try {
    const { locomotiveId, trainServiceId, departureDate, departureTime, notes, forceOverride } = req.body;

    const locomotive = await Locomotive.findById(locomotiveId);
    if (!locomotive) {
      return res.status(404).json({ success: false, error: 'Locomotive not found' });
    }

    const trainService = await TrainService.findById(trainServiceId);
    if (!trainService) {
      return res.status(404).json({ success: false, error: 'Train Service not found' });
    }

    // Run Readiness Evaluation Pre-Check
    const readiness = await evaluateLocomotiveReadiness(locomotiveId);

    if (!readiness.isReadyForDeployment && !forceOverride) {
      return res.status(400).json({
        success: false,
        error: 'Locomotive is not certified as READY in recorded workflows. Deployment blocked.',
        readinessStatus: readiness.calculatedStatus,
        blockers: readiness.blockers,
        warnings: readiness.warnings
      });
    }

    const count = await Deployment.countDocuments();
    const deploymentNumber = `DEP-2026-${String(count + 1).padStart(4, '0')}`;

    const deployment = await Deployment.create({
      deploymentNumber,
      locomotive: locomotive._id,
      trainService: trainService._id,
      departureDate: departureDate || new Date(),
      departureTime: departureTime || trainService.scheduledDeparture,
      assignedBy: req.user._id,
      readinessSnapshot: {
        calculatedStatus: readiness.calculatedStatus,
        inspectionValid: readiness.summary.supervisorApproved,
        openCriticalDefects: readiness.summary.openCriticalDefects,
        openHighDefects: readiness.summary.openHighDefects,
        pendingUrgentMaintenance: readiness.summary.activeMaintenanceTasks,
        supervisorApproved: readiness.summary.supervisorApproved,
        evaluatedAt: new Date()
      },
      status: 'CONFIRMED',
      notes
    });

    // Update Locomotive status & currentAssignment
    locomotive.status = 'READY';
    locomotive.currentAssignment = `${trainService.serviceNumber} - ${trainService.serviceName}`;
    await locomotive.save();

    // Update TrainService assigned Locomotive
    trainService.assignedLocomotive = locomotive._id;
    trainService.status = 'ASSIGNED';
    await trainService.save();

    await logAction({
      user: req.user._id,
      action: 'DEPLOYMENT_CREATED',
      entityType: 'Deployment',
      entityId: deployment._id,
      description: `Dispatched Loco #${locomotive.locoNumber} to Service ${trainService.serviceNumber} (${trainService.serviceName})`,
      ipAddress: req.ip
    });

    await createNotification({
      recipient: req.user._id,
      title: 'Deployment Assigned',
      message: `Loco #${locomotive.locoNumber} successfully assigned to ${trainService.serviceNumber} (${trainService.origin} -> ${trainService.destination})`,
      type: 'DEPLOYMENT',
      link: `/deployments`,
      io: req.io
    });

    res.status(201).json({
      success: true,
      data: deployment
    });
  } catch (err) {
    next(err);
  }
};
