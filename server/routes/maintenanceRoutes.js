import express from 'express';
import {
  getMaintenanceTasks,
  getMaintenanceTaskById,
  createMaintenanceTask,
  updateTaskStatus,
  verifyMaintenanceTask
} from '../controllers/maintenanceController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getMaintenanceTasks)
  .post(authorize('supervisor', 'manager', 'admin'), createMaintenanceTask);

router.route('/:id').get(getMaintenanceTaskById);

router.route('/:id/status').patch(updateTaskStatus);

router.route('/:id/verify').patch(authorize('supervisor', 'manager', 'admin'), verifyMaintenanceTask);

export default router;
