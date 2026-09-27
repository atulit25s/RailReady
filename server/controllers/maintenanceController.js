import { MaintenanceTask } from '../models/MaintenanceTask.js';
import { Locomotive } from '../models/Locomotive.js';
import { Defect } from '../models/Defect.js';
import { logAction } from '../services/auditService.js';
import { createNotification } from '../services/socketService.js';

// @desc    Get all maintenance tasks (Kanban data)
// @route   GET /api/maintenance
// @access  Private
export const getMaintenanceTasks = async (req, res, next) => {
  try {
    const { status, priority, category, locomotiveId, assignedStaff, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (locomotiveId) query.locomotive = locomotiveId;
    if (assignedStaff) query.assignedStaff = assignedStaff;

    if (search) {
      query.$or = [
        { taskNumber: new RegExp(search, 'i') },
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const tasks = await MaintenanceTask.find(query)
      .populate('locomotive', 'locoNumber locoClass status shed currentLocation')
      .populate('defect')
      .populate('assignedStaff', 'name email role')
      .populate('verifiedBy', 'name email role')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single maintenance task
// @route   GET /api/maintenance/:id
// @access  Private
export const getMaintenanceTaskById = async (req, res, next) => {
  try {
    const task = await MaintenanceTask.findById(req.params.id)
      .populate('locomotive')
      .populate('defect')
      .populate('assignedStaff', 'name email role')
      .populate('verifiedBy', 'name email role');

    if (!task) {
      return res.status(404).json({ success: false, error: 'Maintenance task not found' });
    }

    res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new maintenance task
// @route   POST /api/maintenance
// @access  Private (Supervisor / Manager / Admin)
export const createMaintenanceTask = async (req, res, next) => {
  try {
    const {
      locomotiveId,
      defectId,
      title,
      category,
      description,
      assignedStaff,
      priority,
      dueDate,
      notes
    } = req.body;

    const locomotive = await Locomotive.findById(locomotiveId);
    if (!locomotive) {
      return res.status(404).json({ success: false, error: 'Locomotive not found' });
    }

    const count = await MaintenanceTask.countDocuments();
    const taskNumber = `MNT-${String(count + 1).padStart(4, '0')}`;

    const task = await MaintenanceTask.create({
      taskNumber,
      locomotive: locomotive._id,
      defect: defectId || undefined,
      title,
      category: category || 'Mechanical',
      description,
      assignedStaff,
      priority: priority || 'MEDIUM',
      status: assignedStaff ? 'ASSIGNED' : 'PENDING',
      startDate: new Date(),
      dueDate: dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      notes
    });

    locomotive.status = 'UNDER_MAINTENANCE';
    await locomotive.save();

    if (defectId) {
      await Defect.findByIdAndUpdate(defectId, {
        status: 'IN_PROGRESS',
        assignedTo: assignedStaff
      });
    }

    await logAction({
      user: req.user._id,
      action: 'MAINTENANCE_CREATED',
      entityType: 'MaintenanceTask',
      entityId: task._id,
      description: `Created Maintenance Task ${taskNumber} (${title}) for Loco #${locomotive.locoNumber}`,
      ipAddress: req.ip
    });

    if (assignedStaff) {
      await createNotification({
        recipient: assignedStaff,
        title: 'Maintenance Task Assigned',
        message: `Task ${taskNumber}: ${title} on Loco #${locomotive.locoNumber}`,
        type: 'MAINTENANCE',
        link: `/maintenance`,
        io: req.io
      });
    }

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// @desc    Update maintenance task status / progress (Kanban progression)
// @route   PATCH /api/maintenance/:id/status
// @access  Private
export const updateTaskStatus = async (req, res, next) => {
  try {
    const { status, notes, resolutionSummary } = req.body;
    const task = await MaintenanceTask.findById(req.params.id).populate('locomotive');

    if (!task) {
      return res.status(404).json({ success: false, error: 'Maintenance task not found' });
    }

    // Role check: Only supervisors/managers can move task to COMPLETED
    if (status === 'COMPLETED' && !['supervisor', 'manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only supervisors or managers can verify and mark maintenance tasks as COMPLETED'
      });
    }

    task.status = status;
    if (notes) task.notes = notes;
    if (resolutionSummary) task.resolutionSummary = resolutionSummary;

    if (status === 'COMPLETED') {
      task.completedDate = new Date();
      task.verifiedBy = req.user._id;
      task.verifiedAt = new Date();

      if (task.defect) {
        await Defect.findByIdAndUpdate(task.defect, {
          status: 'RESOLVED',
          resolutionNotes: resolutionSummary || 'Resolved via maintenance task'
        });
      }

      // Check if all other tasks on this locomotive are completed
      const pendingTasks = await MaintenanceTask.countDocuments({
        locomotive: task.locomotive._id,
        status: { $ne: 'COMPLETED' },
        _id: { $ne: task._id }
      });

      if (pendingTasks === 0) {
        const loco = await Locomotive.findById(task.locomotive._id);
        loco.lastMaintenanceDate = new Date();
        await loco.save();
      }
    }

    await task.save();

    await logAction({
      user: req.user._id,
      action: 'MAINTENANCE_STATUS_UPDATED',
      entityType: 'MaintenanceTask',
      entityId: task._id,
      description: `Task ${task.taskNumber} moved to ${status}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// @desc    Supervisor verifies maintenance task
// @route   PATCH /api/maintenance/:id/verify
// @access  Private (Supervisor / Manager / Admin)
export const verifyMaintenanceTask = async (req, res, next) => {
  try {
    const { approved, notes } = req.body;
    const task = await MaintenanceTask.findById(req.params.id).populate('locomotive');

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    if (approved) {
      task.status = 'COMPLETED';
      task.completedDate = new Date();
      task.verifiedBy = req.user._id;
      task.verifiedAt = new Date();
      if (notes) task.resolutionSummary = `${task.resolutionSummary || ''}\nSupervisor Note: ${notes}`;

      if (task.defect) {
        await Defect.findByIdAndUpdate(task.defect, {
          status: 'CLOSED',
          verifiedBy: req.user._id,
          verifiedAt: new Date()
        });
      }
    } else {
      task.status = 'IN_PROGRESS';
      if (notes) task.notes = `${task.notes || ''}\nVerification Rejected: ${notes}`;
    }

    await task.save();

    await logAction({
      user: req.user._id,
      action: approved ? 'MAINTENANCE_VERIFIED' : 'MAINTENANCE_REOPENED',
      entityType: 'MaintenanceTask',
      entityId: task._id,
      description: `Supervisor ${approved ? 'verified and closed' : 'rejected verification for'} task ${task.taskNumber}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};
