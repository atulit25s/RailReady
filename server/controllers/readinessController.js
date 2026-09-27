import { Locomotive } from '../models/Locomotive.js';
import { evaluateLocomotiveReadiness } from '../services/readinessService.js';

// @desc    Get Readiness overview for entire fleet
// @route   GET /api/readiness
// @access  Private
export const getFleetReadiness = async (req, res, next) => {
  try {
    const locomotives = await Locomotive.find().sort({ locoNumber: 1 });
    const readinessReports = await Promise.all(
      locomotives.map((loco) => evaluateLocomotiveReadiness(loco._id))
    );

    const readyCount = readinessReports.filter((r) => r.isReadyForDeployment).length;
    const pendingCount = readinessReports.filter((r) => r.calculatedStatus === 'INSPECTION_PENDING').length;
    const maintenanceCount = readinessReports.filter((r) => r.calculatedStatus === 'UNDER_MAINTENANCE').length;
    const attentionCount = readinessReports.filter((r) => r.calculatedStatus === 'REQUIRES_ATTENTION').length;

    res.status(200).json({
      success: true,
      stats: {
        total: locomotives.length,
        ready: readyCount,
        inspectionPending: pendingCount,
        underMaintenance: maintenanceCount,
        requiresAttention: attentionCount
      },
      data: readinessReports
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Readiness report for single locomotive
// @route   GET /api/readiness/:id
// @access  Private
export const getLocomotiveReadiness = async (req, res, next) => {
  try {
    const report = await evaluateLocomotiveReadiness(req.params.id);
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (err) {
    next(err);
  }
};
