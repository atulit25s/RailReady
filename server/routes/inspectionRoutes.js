import express from 'express';
import {
  getInspections,
  getInspectionById,
  createInspection,
  updateInspectionDraft,
  submitInspection,
  reviewInspection
} from '../controllers/inspectionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getInspections)
  .post(authorize('supervisor', 'manager', 'admin'), createInspection);

router.route('/:id').get(getInspectionById).put(updateInspectionDraft);

router.route('/:id/submit').post(submitInspection);

router.route('/:id/review').patch(authorize('supervisor', 'manager', 'admin'), reviewInspection);

export default router;
