import { Inspection } from '../models/Inspection.js';
import { Locomotive } from '../models/Locomotive.js';
import { Defect } from '../models/Defect.js';
import { InspectionTemplate } from '../models/InspectionTemplate.js';
import { defaultChecklistItems } from './templateController.js';
import { logAction } from '../services/auditService.js';
import { createNotification } from '../services/socketService.js';

// @desc    Get all inspections with filtering
// @route   GET /api/inspections
// @access  Private
export const getInspections = async (req, res, next) => {
  try {
    const { status, locomotiveId, inspectorId, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (locomotiveId) query.locomotive = locomotiveId;
    if (inspectorId) query.inspector = inspectorId;

    // Technicians see only their assigned inspections if not admin/supervisor
    if (req.user.role === 'technician' && !inspectorId) {
      query.inspector = req.user._id;
    }

    const total = await Inspection.countDocuments(query);
    const inspections = await Inspection.find(query)
      .populate('locomotive', 'locoNumber locoClass status shed currentLocation')
      .populate('inspector', 'name email role')
      .populate('supervisor', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: inspections.length,
      total,
      data: inspections
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single inspection by ID
// @route   GET /api/inspections/:id
// @access  Private
export const getInspectionById = async (req, res, next) => {
  try {
    const inspection = await Inspection.findById(req.params.id)
      .populate('locomotive')
      .populate('inspector', 'name email role shed')
      .populate('supervisor', 'name email role')
      .populate('template');

    if (!inspection) {
      return res.status(404).json({ success: false, error: 'Inspection record not found' });
    }

    res.status(200).json({
      success: true,
      data: inspection
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create/Schedule new inspection
// @route   POST /api/inspections
// @access  Private (Supervisor / Manager / Admin)
export const createInspection = async (req, res, next) => {
  try {
    const { locomotiveId, inspectorId, notes } = req.body;

    const locomotive = await Locomotive.findById(locomotiveId);
    if (!locomotive) {
      return res.status(404).json({ success: false, error: 'Locomotive not found' });
    }

    let template = await InspectionTemplate.findOne({ isDefault: true });
    if (!template) {
      template = await InspectionTemplate.create({
        title: 'Standard Pre-Deployment Locomotive Checklist (ELS-STD-2026)',
        version: 'v2.4',
        isDefault: true,
        items: defaultChecklistItems
      });
    }

    // Initialize checklist items from template
    const items = template.items.map((item) => ({
      category: item.category,
      itemTitle: item.title,
      result: 'PENDING',
      comment: ''
    }));

    const count = await Inspection.countDocuments();
    const inspectionNumber = `INS-2026-${String(count + 1).padStart(4, '0')}`;

    const inspection = await Inspection.create({
      inspectionNumber,
      locomotive: locomotive._id,
      inspector: inspectorId || req.user._id,
      supervisor: req.user._id,
      template: template._id,
      status: 'PENDING',
      items,
      submissionNotes: notes,
      auditHistory: [
        {
          status: 'PENDING',
          updatedBy: req.user._id,
          notes: 'Inspection scheduled'
        }
      ]
    });

    locomotive.status = 'INSPECTION_PENDING';
    await locomotive.save();

    await logAction({
      user: req.user._id,
      action: 'INSPECTION_CREATED',
      entityType: 'Inspection',
      entityId: inspection._id,
      description: `Scheduled inspection ${inspectionNumber} for Loco #${locomotive.locoNumber}`,
      ipAddress: req.ip
    });

    if (inspectorId && String(inspectorId) !== String(req.user._id)) {
      await createNotification({
        recipient: inspectorId,
        title: 'New Inspection Assigned',
        message: `You have been assigned to inspect Locomotive #${locomotive.locoNumber}`,
        type: 'INSPECTION',
        link: `/inspections/${inspection._id}`,
        io: req.io
      });
    }

    res.status(201).json({
      success: true,
      data: inspection
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update checklist items (draft progress)
// @route   PUT /api/inspections/:id
// @access  Private (Technician / Inspector)
export const updateInspectionDraft = async (req, res, next) => {
  try {
    const { items, submissionNotes, status } = req.body;
    const inspection = await Inspection.findById(req.params.id);

    if (!inspection) {
      return res.status(404).json({ success: false, error: 'Inspection not found' });
    }

    if (['APPROVED'].includes(inspection.status)) {
      return res.status(400).json({ success: false, error: 'Cannot modify already approved inspection' });
    }

    if (items) inspection.items = items;
    if (submissionNotes !== undefined) inspection.submissionNotes = submissionNotes;

    if (status && ['IN_PROGRESS', 'PENDING'].includes(status)) {
      inspection.status = status;
    } else if (inspection.status === 'PENDING') {
      inspection.status = 'IN_PROGRESS';
    }

    await inspection.save();

    res.status(200).json({
      success: true,
      data: inspection
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit inspection for supervisor review (auto-triggers defects on FAIL)
// @route   POST /api/inspections/:id/submit
// @access  Private (Technician / Inspector)
export const submitInspection = async (req, res, next) => {
  try {
    const { items, submissionNotes } = req.body;
    const inspection = await Inspection.findById(req.params.id).populate('locomotive');

    if (!inspection) {
      return res.status(404).json({ success: false, error: 'Inspection not found' });
    }

    if (items) inspection.items = items;
    if (submissionNotes) inspection.submissionNotes = submissionNotes;

    inspection.status = 'SUBMITTED';
    inspection.submittedAt = new Date();
    inspection.auditHistory.push({
      status: 'SUBMITTED',
      updatedBy: req.user._id,
      notes: submissionNotes || 'Inspection completed and submitted for review'
    });

    await inspection.save();

    // Scan for failed items and auto-create defects
    const failedItems = inspection.items.filter((it) => it.result === 'FAIL' || it.result === 'REQUIRES_ATTENTION');
    const autoCreatedDefects = [];

    for (const fail of failedItems) {
      const defectCount = await Defect.countDocuments();
      const defectNumber = `DEF-${String(defectCount + 1).padStart(4, '0')}`;
      const severity = fail.result === 'FAIL' ? 'HIGH' : 'MEDIUM';

      const defect = await Defect.create({
        defectNumber,
        locomotive: inspection.locomotive._id,
        inspection: inspection._id,
        category: fail.category || 'Other',
        severity,
        description: `Automated Defect from Inspection ${inspection.inspectionNumber}: ${fail.itemTitle}. Comment: ${fail.comment || 'Checklist failed during digital inspection.'}`,
        reportedBy: req.user._id,
        status: 'OPEN'
      });
      autoCreatedDefects.push(defect);
    }

    // Update Locomotive status to AWAITING_REVIEW or REQUIRES_ATTENTION
    const loco = await Locomotive.findById(inspection.locomotive._id);
    if (failedItems.length > 0) {
      loco.status = 'REQUIRES_ATTENTION';
    } else {
      loco.status = 'AWAITING_REVIEW';
    }
    loco.lastInspectionDate = new Date();
    await loco.save();

    await logAction({
      user: req.user._id,
      action: 'INSPECTION_SUBMITTED',
      entityType: 'Inspection',
      entityId: inspection._id,
      description: `Submitted inspection ${inspection.inspectionNumber} for Loco #${loco.locoNumber}. ${autoCreatedDefects.length} defect(s) flagged.`,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      data: inspection,
      defectsCreated: autoCreatedDefects.length
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Supervisor review inspection (Approve or Reject)
// @route   PATCH /api/inspections/:id/review
// @access  Private (Supervisor / Manager / Admin)
export const reviewInspection = async (req, res, next) => {
  try {
    const { action, supervisorFeedback } = req.body; // action: 'APPROVE' or 'REJECT'
    const inspection = await Inspection.findById(req.params.id).populate('locomotive');

    if (!inspection) {
      return res.status(404).json({ success: false, error: 'Inspection not found' });
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ success: false, error: "Action must be 'APPROVE' or 'REJECT'" });
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    inspection.status = newStatus;
    inspection.supervisor = req.user._id;
    inspection.supervisorFeedback = supervisorFeedback || (action === 'APPROVE' ? 'Approved by supervisor' : 'Rejected for correction');
    inspection.reviewedAt = new Date();
    inspection.auditHistory.push({
      status: newStatus,
      updatedBy: req.user._id,
      notes: inspection.supervisorFeedback
    });

    await inspection.save();

    // Update Locomotive status
    const loco = await Locomotive.findById(inspection.locomotive._id);
    if (action === 'APPROVE') {
      const openDefects = await Defect.countDocuments({
        locomotive: loco._id,
        status: { $in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] }
      });
      loco.status = openDefects > 0 ? 'UNDER_MAINTENANCE' : 'READY';
      // Set next inspection 7 days ahead
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 7);
      loco.nextInspectionDate = nextDate;
    } else {
      loco.status = 'REQUIRES_ATTENTION';
    }
    await loco.save();

    await logAction({
      user: req.user._id,
      action: action === 'APPROVE' ? 'INSPECTION_APPROVED' : 'INSPECTION_REJECTED',
      entityType: 'Inspection',
      entityId: inspection._id,
      description: `Supervisor ${action === 'APPROVE' ? 'approved' : 'rejected'} inspection ${inspection.inspectionNumber} for Loco #${loco.locoNumber}`,
      ipAddress: req.ip
    });

    // Notify inspector
    await createNotification({
      recipient: inspection.inspector,
      title: `Inspection ${inspection.inspectionNumber} ${newStatus}`,
      message: `Supervisor ${req.user.name} has ${newStatus.toLowerCase()} your inspection submission on Loco #${loco.locoNumber}.`,
      type: 'INSPECTION',
      link: `/inspections/${inspection._id}`,
      io: req.io
    });

    res.status(200).json({
      success: true,
      data: inspection
    });
  } catch (err) {
    next(err);
  }
};
