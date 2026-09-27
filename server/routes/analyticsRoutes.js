import express from 'express';
import { getDashboardMetrics, getDetailedAnalytics } from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardMetrics);
router.get('/overview', getDetailedAnalytics);

export default router;
