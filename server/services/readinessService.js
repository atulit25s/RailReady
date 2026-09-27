import { Locomotive } from '../models/Locomotive.js';
import { Inspection } from '../models/Inspection.js';
import { Defect } from '../models/Defect.js';
import { MaintenanceTask } from '../models/MaintenanceTask.js';

export const evaluateLocomotiveReadiness = async (locomotiveId) => {
  const locomotive = await Locomotive.findById(locomotiveId);
  if (!locomotive) {
    throw new Error('Locomotive not found');
  }

  // 1. Fetch latest inspection
  const latestInspection = await Inspection.findOne({ locomotive: locomotiveId })
    .sort({ createdAt: -1 })
    .populate('inspector', 'name role')
    .populate('supervisor', 'name role');

  // 2. Fetch open defects (Critical, High, Medium, Low)
  const openDefects = await Defect.find({
    locomotive: locomotiveId,
    status: { $in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_VERIFICATION'] }
  });

  const criticalDefects = openDefects.filter((d) => d.severity === 'CRITICAL');
  const highDefects = openDefects.filter((d) => d.severity === 'HIGH');
  const mediumLowDefects = openDefects.filter((d) => d.severity === 'MEDIUM' || d.severity === 'LOW');

  // 3. Fetch active maintenance tasks
  const activeTasks = await MaintenanceTask.find({
    locomotive: locomotiveId,
    status: { $in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'VERIFICATION_REQUIRED'] }
  });

  const urgentTasks = activeTasks.filter((t) => t.priority === 'URGENT' || t.priority === 'HIGH');

  // Rule Evaluation
  const blockers = [];
  const warnings = [];

  const inspectionApproved = latestInspection && latestInspection.status === 'APPROVED';
  const inspectionPending = !latestInspection || ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW'].includes(latestInspection.status);
  const inspectionRejected = latestInspection && latestInspection.status === 'REJECTED';

  if (!latestInspection) {
    blockers.push('No digital inspection has been recorded for this locomotive.');
  } else if (inspectionPending) {
    blockers.push(`Digital inspection ${latestInspection.inspectionNumber} is currently ${latestInspection.status.replace('_', ' ')}.`);
  } else if (inspectionRejected) {
    blockers.push(`Digital inspection ${latestInspection.inspectionNumber} was REJECTED by supervisor.`);
  }

  if (criticalDefects.length > 0) {
    criticalDefects.forEach((d) => {
      blockers.push(`CRITICAL Defect unresolved: ${d.defectNumber} (${d.category} - ${d.description.substring(0, 40)}...)`);
    });
  }

  if (highDefects.length > 0) {
    highDefects.forEach((d) => {
      blockers.push(`HIGH Severity Defect unresolved: ${d.defectNumber} (${d.category})`);
    });
  }

  if (urgentTasks.length > 0) {
    urgentTasks.forEach((t) => {
      blockers.push(`Urgent Maintenance Task in progress: ${t.taskNumber} (${t.title})`);
    });
  }

  if (mediumLowDefects.length > 0) {
    warnings.push(`${mediumLowDefects.length} minor/medium defect(s) logged on locomotive.`);
  }

  let calculatedStatus = 'READY';
  let isReadyForDeployment = false;

  if (locomotive.status === 'OUT_OF_SERVICE') {
    calculatedStatus = 'OUT_OF_SERVICE';
    blockers.push('Locomotive is flagged OUT OF SERVICE by shed administration.');
  } else if (blockers.length > 0) {
    if (criticalDefects.length > 0 || urgentTasks.length > 0) {
      calculatedStatus = 'UNDER_MAINTENANCE';
    } else if (inspectionPending) {
      calculatedStatus = 'INSPECTION_PENDING';
    } else {
      calculatedStatus = 'REQUIRES_ATTENTION';
    }
  } else {
    calculatedStatus = 'READY';
    isReadyForDeployment = true;
  }

  return {
    locomotive: {
      _id: locomotive._id,
      locoNumber: locomotive.locoNumber,
      locoClass: locomotive.locoClass,
      shed: locomotive.shed,
      currentLocation: locomotive.currentLocation,
      currentStatus: locomotive.status,
      mileageKm: locomotive.mileageKm
    },
    calculatedStatus,
    isReadyForDeployment,
    blockers,
    warnings,
    summary: {
      inspectionState: latestInspection ? latestInspection.status : 'NONE',
      latestInspectionNumber: latestInspection?.inspectionNumber,
      openCriticalDefects: criticalDefects.length,
      openHighDefects: highDefects.length,
      openMinorDefects: mediumLowDefects.length,
      activeMaintenanceTasks: activeTasks.length,
      supervisorApproved: inspectionApproved
    },
    evaluatedAt: new Date()
  };
};
