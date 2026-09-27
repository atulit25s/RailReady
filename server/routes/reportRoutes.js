import express from 'express';
import { getInspectionPDFReport, getSummaryReportData } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/inspections/:id/pdf', getInspectionPDFReport);
router.post('/summary', getSummaryReportData);

export default router;
