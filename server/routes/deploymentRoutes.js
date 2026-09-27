import express from 'express';
import { getDeployments, createDeployment } from '../controllers/deploymentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getDeployments)
  .post(authorize('manager', 'admin'), createDeployment);

export default router;
