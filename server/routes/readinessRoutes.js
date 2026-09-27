import express from 'express';
import { getFleetReadiness, getLocomotiveReadiness } from '../controllers/readinessController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getFleetReadiness);
router.get('/:id', getLocomotiveReadiness);

export default router;
