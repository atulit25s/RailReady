import { Defect } from '../models/Defect.js';
import { Locomotive } from '../models/Locomotive.js';
import { logAction } from '../services/auditService.js';
import { createNotification } from '../services/socketService.js';

// @desc    Get all defects with filtering
// @route   GET /api/defects
// @access  Private
export const getDefects = async (req, res, next) => {
  try {
    const { severity, category, status, locomotiveId, assignedTo, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (severity) query.severity = severity;
    if (category) query.category = category;
    if (status) query.status = status;
    if (locomotiveId) query.locomotive = locomotiveId;
    if (assignedTo) query.assignedTo = assignedTo;

    if (search) {
      query.$or = [
        { defectNumber: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const total = await Defect.countDocuments(query);
    const defects = await Defect.find(query)
      .populate('locomotive', 'locoNumber locoClass status shed currentLocation')
      .populate('reportedBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('verifiedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: defects.length,
      total,
      data: defects
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single defect by ID
// @route   GET /api/defects/:id
// @access  Private
export const getDefectById = async (req, res, next) => {
  try {
    const defect = await Defect.findById(req.params.id)
      .populate('locomotive')
      .populate('reportedBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('verifiedBy', 'name email role')
      .populate('inspection');

    if (!defect) {
      return res.status(404).json({ success: false, error: 'Defect not found' });
    }

    res.status(200).json({ success: true, data: defect });
  } catch (err) {
    next(err);
  }
};

// @desc    Report new defect manually
// @route   POST /api/defects
// @access  Private
export const createDefect = async (req, res, next) => {
  try {
    const { locomotiveId, category, severity, description, photos, assignedTo } = req.body;

    const locomotive = await Locomotive.findById(locomotiveId);
    if (!locomotive) {
      return res.status(404).json({ success: false, error: 'Locomotive not found' });
    }

    const count = await Defect.countDocuments();
    const defectNumber = `DEF-${String(count + 1).padStart(4, '0')}`;

    const defect = await Defect.create({
      defectNumber,
      locomotive: locomotive._id,
      category: category || 'Other',
      severity: severity || 'MEDIUM',
      description,
      reportedBy: req.user._id,
      assignedTo,
      status: assignedTo ? 'ASSIGNED' : 'OPEN',
      photos: photos || []
    });

    if (severity === 'CRITICAL' || severity === 'HIGH') {
      locomotive.status = 'UNDER_MAINTENANCE';
      await locomotive.save();
    }

    await logAction({
      user: req.user._id,
      action: 'DEFECT_CREATED',
      entityType: 'Defect',
      entityId: defect._id,
      description: `Reported ${severity} defect ${defectNumber} on Loco #${locomotive.locoNumber}: ${category}`,
      ipAddress: req.ip
    });

    if (severity === 'CRITICAL') {
      await createNotification({
        recipient: req.user._id, // Broadcast or manager
        title: 'CRITICAL Defect Reported',
        message: `🚨 Critical Defect ${defectNumber} reported on Loco #${locomotive.locoNumber} (${category})`,
        type: 'DEFECT',
        link: `/defects/${defect._id}`,
        io: req.io
      });
    }

    res.status(201).json({ success: true, data: defect });
  } catch (err) {
    next(err);
  }
};

// @desc    Assign defect to technician/team
// @route   PATCH /api/defects/:id/assign
// @access  Private (Supervisor / Manager)
export const assignDefect = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;
    const defect = await Defect.findById(req.params.id).populate('locomotive');

    if (!defect) {
      return res.status(404).json({ success: false, error: 'Defect not found' });
    }

    defect.assignedTo = assignedTo;
    defect.status = 'ASSIGNED';
    await defect.save();

    await logAction({
      user: req.user._id,
      action: 'DEFECT_ASSIGNED',
      entityType: 'Defect',
      entityId: defect._id,
      description: `Assigned Defect ${defect.defectNumber} to technician`,
      ipAddress: req.ip
    });

    await createNotification({
      recipient: assignedTo,
      title: 'Defect Assigned',
      message: `You were assigned Defect ${defect.defectNumber} on Loco #${defect.locomotive?.locoNumber}`,
      type: 'DEFECT',
      link: `/defects/${defect._id}`,
      io: req.io
    });

    res.status(200).json({ success: true, data: defect });
  } catch (err) {
    next(err);
  }
};

// @desc    Technician submits defect resolution
// @route   PATCH /api/defects/:id/resolve
// @access  Private (Technician / Assigned Staff)
export const resolveDefect = async (req, res, next) => {
  try {
    const { resolutionNotes } = req.body;
    const defect = await Defect.findById(req.params.id).populate('locomotive');

    if (!defect) {
      return res.status(404).json({ success: false, error: 'Defect not found' });
    }

    defect.resolutionNotes = resolutionNotes || 'Repairs completed by technician.';
    defect.status = 'WAITING_VERIFICATION';
    defect.resolvedAt = new Date();
    await defect.save();

    await logAction({
      user: req.user._id,
      action: 'DEFECT_RESOLVED',
      entityType: 'Defect',
      entityId: defect._id,
      description: `Technician resolved Defect ${defect.defectNumber} - Pending Supervisor verification`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: defect });
  } catch (err) {
    next(err);
  }
};

// @desc    Supervisor verifies and closes defect
// @route   PATCH /api/defects/:id/verify
// @access  Private (Supervisor / Manager / Admin)
export const verifyDefect = async (req, res, next) => {
  try {
    const { approved, notes } = req.body; // approved: boolean
    const defect = await Defect.findById(req.params.id).populate('locomotive');

    if (!defect) {
      return res.status(404).json({ success: false, error: 'Defect not found' });
    }

    if (approved) {
      defect.status = 'CLOSED';
      defect.verifiedBy = req.user._id;
      defect.verifiedAt = new Date();
      if (notes) defect.resolutionNotes = `${defect.resolutionNotes || ''}\nSupervisor Note: ${notes}`;
    } else {
      defect.status = 'IN_PROGRESS';
      if (notes) defect.resolutionNotes = `${defect.resolutionNotes || ''}\nVerification Rejected: ${notes}`;
    }

    await defect.save();

    await logAction({
      user: req.user._id,
      action: approved ? 'DEFECT_CLOSED' : 'DEFECT_REOPENED',
      entityType: 'Defect',
      entityId: defect._id,
      description: `Supervisor ${approved ? 'verified and closed' : 're-opened'} Defect ${defect.defectNumber}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: defect });
  } catch (err) {
    next(err);
  }
};
