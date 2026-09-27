import express from 'express';
import {
  getTrainServices,
  getTrainServiceById,
  createTrainService
} from '../controllers/serviceController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getTrainServices)
  .post(authorize('manager', 'admin'), createTrainService);

router.route('/:id').get(getTrainServiceById);

export default router;
