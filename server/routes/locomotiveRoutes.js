import express from 'express';
import {
  getLocomotives,
  getLocomotiveById,
  getLocomotiveQR,
  createLocomotive,
  updateLocomotive,
  deleteLocomotive
} from '../controllers/locomotiveController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getLocomotives)
  .post(authorize('admin', 'manager'), createLocomotive);

router.route('/:id/qr').get(getLocomotiveQR);

router
  .route('/:id')
  .get(getLocomotiveById)
  .put(authorize('admin', 'manager', 'supervisor'), updateLocomotive)
  .delete(authorize('admin'), deleteLocomotive);

export default router;
