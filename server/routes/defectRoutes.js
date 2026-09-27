import express from 'express';
import {
  getDefects,
  getDefectById,
  createDefect,
  assignDefect,
  resolveDefect,
  verifyDefect
} from '../controllers/defectController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getDefects).post(createDefect);

router.route('/:id').get(getDefectById);

router.route('/:id/assign').patch(authorize('supervisor', 'manager', 'admin'), assignDefect);

router.route('/:id/resolve').patch(resolveDefect);

router.route('/:id/verify').patch(authorize('supervisor', 'manager', 'admin'), verifyDefect);

export default router;
