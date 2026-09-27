import { Locomotive } from '../models/Locomotive.js';
import { Inspection } from '../models/Inspection.js';
import { Defect } from '../models/Defect.js';
import { MaintenanceTask } from '../models/MaintenanceTask.js';
import { Deployment } from '../models/Deployment.js';
import { AuditLog } from '../models/AuditLog.js';

// @desc    Get complete Operations Dashboard metrics
// @route   GET /api/analytics/dashboard
// @access  Private
export const getDashboardMetrics = async (req, res, next) => {
  try {
    // 1. Locomotive Status counts
    const totalLocomotives = await Locomotive.countDocuments();
    const readyLocomotives = await Locomotive.countDocuments({ status: 'READY' });
    const underMaintenance = await Locomotive.countDocuments({ status: 'UNDER_MAINTENANCE' });
    const inspectionPending = await Locomotive.countDocuments({
      status: { $in: ['INSPECTION_PENDING', 'AWAITING_REVIEW', 'REQUIRES_ATTENTION'] }
    });
    const outOfService = await Locomotive.countDocuments({ status: 'OUT_OF_SERVICE' });

    // 2. Open Defect counts
    const openDefects = await Defect.countDocuments({
      status: { $in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_VERIFICATION'] }
    });
    const criticalDefects = await Defect.countDocuments({
      severity: 'CRITICAL',
      status: { $in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_VERIFICATION'] }
    });
    const highDefects = await Defect.countDocuments({
      severity: 'HIGH',
      status: { $in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_VERIFICATION'] }
    });

    // 3. Defects grouped by category
    const defectsByCategory = await Defect.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          openCount: {
            $sum: {
              $cond: [{ $in: ['$status', ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_VERIFICATION']] }, 1, 0]
            }
          }
        }
      }
    ]);

    // 4. Maintenance Activity stats
    const maintenanceCompleted = await MaintenanceTask.countDocuments({ status: 'COMPLETED' });
    const maintenanceInProgress = await MaintenanceTask.countDocuments({ status: 'IN_PROGRESS' });
    const maintenancePending = await MaintenanceTask.countDocuments({ status: { $in: ['PENDING', 'ASSIGNED'] } });
    const maintenanceVerification = await MaintenanceTask.countDocuments({ status: 'VERIFICATION_REQUIRED' });

    // 5. Inspection volume (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const inspectionTrend = await Inspection.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 6. Recent Operational Activity Feed (from AuditLog)
    const recentActivity = await AuditLog.find()
      .populate('user', 'name role')
      .sort({ timestamp: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalLocomotives,
          readyAvailable: readyLocomotives,
          underMaintenance,
          inspectionPending,
          openDefects,
          criticalDefects,
          highDefects,
          outOfService
        },
        fleetStatusBreakdown: [
          { name: 'Ready / Available', value: readyLocomotives, color: '#10b981' },
          { name: 'Under Maintenance', value: underMaintenance, color: '#f59e0b' },
          { name: 'Inspection Pending', value: inspectionPending, color: '#6366f1' },
          { name: 'Out of Service', value: outOfService, color: '#f43f5e' }
        ],
        defectsByCategory: defectsByCategory.map((d) => ({
          category: d._id,
          total: d.count,
          open: d.openCount
        })),
        maintenanceActivity: {
          completed: maintenanceCompleted,
          inProgress: maintenanceInProgress,
          pending: maintenancePending,
          verificationRequired: maintenanceVerification
        },
        inspectionTrend,
        recentActivity
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Detailed Analytics (Fleet utilization, MTTR, Locomotive distribution)
// @route   GET /api/analytics/overview
// @access  Private
export const getDetailedAnalytics = async (req, res, next) => {
  try {
    const locomotivesByClass = await Locomotive.aggregate([
      { $group: { _id: '$locoClass', count: { $sum: 1 } } }
    ]);

    const defectsBySeverity = await Defect.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    const totalDeployments = await Deployment.countDocuments();
    const confirmedDeployments = await Deployment.countDocuments({ status: 'CONFIRMED' });

    res.status(200).json({
      success: true,
      data: {
        locomotivesByClass,
        defectsBySeverity,
        deploymentStats: {
          total: totalDeployments,
          confirmed: confirmedDeployments
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
