import { AuditLog } from '../models/AuditLog.js';

// @desc    Get system audit logs with filters & search
// @route   GET /api/audit-logs
// @access  Private (Admin)
export const getAuditLogs = async (req, res, next) => {
  try {
    const { action, entityType, userId, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (userId) query.user = userId;
    if (search) {
      query.$or = [
        { action: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { entityId: new RegExp(search, 'i') }
      ];
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: Number(page),
      data: logs
    });
  } catch (err) {
    next(err);
  }
};
