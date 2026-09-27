import { Locomotive } from '../models/Locomotive.js';
import { Inspection } from '../models/Inspection.js';
import { Defect } from '../models/Defect.js';
import { MaintenanceTask } from '../models/MaintenanceTask.js';
import { Deployment } from '../models/Deployment.js';
import { generateLocomotiveQR } from '../services/qrService.js';
import { logAction } from '../services/auditService.js';

// @desc    Get all locomotives with filtering & search
// @route   GET /api/locomotives
// @access  Private
export const getLocomotives = async (req, res, next) => {
  try {
    const { status, locoClass, shed, search, page = 1, limit = 100 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (locoClass) query.locoClass = locoClass;
    if (shed) query.shed = new RegExp(shed, 'i');
    if (search) {
      query.$or = [
        { locoNumber: new RegExp(search, 'i') },
        { manufacturer: new RegExp(search, 'i') },
        { currentLocation: new RegExp(search, 'i') }
      ];
    }

    const total = await Locomotive.countDocuments(query);
    const locomotives = await Locomotive.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: locomotives.length,
      total,
      page: Number(page),
      data: locomotives
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single locomotive with full aggregated details (7 tabs)
// @route   GET /api/locomotives/:id
// @access  Private
export const getLocomotiveById = async (req, res, next) => {
  try {
    const locomotive = await Locomotive.findById(req.params.id);
    if (!locomotive) {
      return res.status(404).json({ success: false, error: 'Locomotive not found' });
    }

    // Parallel fetch related data for details tabs
    const [inspections, defects, maintenanceTasks, deployments] = await Promise.all([
      Inspection.find({ locomotive: locomotive._id })
        .populate('inspector', 'name email role')
        .populate('supervisor', 'name email role')
        .sort({ createdAt: -1 })
        .limit(20),
      Defect.find({ locomotive: locomotive._id })
        .populate('reportedBy', 'name email role')
        .populate('assignedTo', 'name email role')
        .populate('verifiedBy', 'name email role')
        .sort({ createdAt: -1 }),
      MaintenanceTask.find({ locomotive: locomotive._id })
        .populate('assignedStaff', 'name email role')
        .populate('verifiedBy', 'name email role')
        .sort({ createdAt: -1 }),
      Deployment.find({ locomotive: locomotive._id })
        .populate('trainService')
        .populate('assignedBy', 'name email role')
        .sort({ departureDate: -1 })
        .limit(15)
    ]);

    res.status(200).json({
      success: true,
      data: {
        locomotive,
        inspections,
        defects,
        maintenanceTasks,
        deployments
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get QR Code for Locomotive
// @route   GET /api/locomotives/:id/qr
// @access  Private
export const getLocomotiveQR = async (req, res, next) => {
  try {
    const locomotive = await Locomotive.findById(req.params.id);
    if (!locomotive) {
      return res.status(404).json({ success: false, error: 'Locomotive not found' });
    }

    const qrDataUrl = await generateLocomotiveQR(locomotive);

    res.status(200).json({
      success: true,
      data: {
        locoNumber: locomotive.locoNumber,
        locoClass: locomotive.locoClass,
        shed: locomotive.shed,
        status: locomotive.status,
        qrCode: qrDataUrl
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new Locomotive
// @route   POST /api/locomotives
// @access  Private (Admin / Manager)
export const createLocomotive = async (req, res, next) => {
  try {
    const { locoNumber, locoClass, shed, manufacturer, commissioningDate, currentLocation, mileageKm, notes, status } = req.body;

    const exists = await Locomotive.findOne({ locoNumber });
    if (exists) {
      return res.status(400).json({ success: false, error: `Locomotive #${locoNumber} already exists in fleet` });
    }

    const locomotive = await Locomotive.create({
      locoNumber,
      locoClass: locoClass || 'WAP-7',
      shed: shed || 'Central Locomotive Shed - Kalyan (ELS)',
      manufacturer: manufacturer || 'Chittaranjan Locomotive Works (CLW)',
      commissioningDate: commissioningDate || new Date(),
      currentLocation: currentLocation || 'Bay 1 - Inbound Inspection',
      mileageKm: mileageKm || 0,
      notes,
      status: status || 'INSPECTION_PENDING'
    });

    const qrCode = await generateLocomotiveQR(locomotive);
    locomotive.qrCodeData = qrCode;
    await locomotive.save();

    await logAction({
      user: req.user._id,
      action: 'LOCOMOTIVE_CREATED',
      entityType: 'Locomotive',
      entityId: locomotive._id,
      description: `Added new Locomotive #${locomotive.locoNumber} (${locomotive.locoClass}) to fleet`,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      data: locomotive
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update Locomotive
// @route   PUT /api/locomotives/:id
// @access  Private (Admin / Manager / Supervisor)
export const updateLocomotive = async (req, res, next) => {
  try {
    const locomotive = await Locomotive.findById(req.params.id);
    if (!locomotive) {
      return res.status(404).json({ success: false, error: 'Locomotive not found' });
    }

    const allowedFields = [
      'locoClass',
      'shed',
      'manufacturer',
      'status',
      'currentLocation',
      'lastInspectionDate',
      'nextInspectionDate',
      'lastMaintenanceDate',
      'currentAssignment',
      'mileageKm',
      'notes'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        locomotive[field] = req.body[field];
      }
    });

    await locomotive.save();

    await logAction({
      user: req.user._id,
      action: 'LOCOMOTIVE_UPDATED',
      entityType: 'Locomotive',
      entityId: locomotive._id,
      description: `Updated details/status for Loco #${locomotive.locoNumber} to ${locomotive.status}`,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      data: locomotive
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete Locomotive
// @route   DELETE /api/locomotives/:id
// @access  Private (Admin)
export const deleteLocomotive = async (req, res, next) => {
  try {
    const locomotive = await Locomotive.findById(req.params.id);
    if (!locomotive) {
      return res.status(404).json({ success: false, error: 'Locomotive not found' });
    }

    await Locomotive.findByIdAndDelete(req.params.id);

    await logAction({
      user: req.user._id,
      action: 'LOCOMOTIVE_DELETED',
      entityType: 'Locomotive',
      entityId: req.params.id,
      description: `Deleted Locomotive #${locomotive.locoNumber} from fleet`,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Locomotive #${locomotive.locoNumber} removed successfully`
    });
  } catch (err) {
    next(err);
  }
};
