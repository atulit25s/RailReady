import express from 'express';
import { getTemplates, getDefaultTemplate } from '../controllers/templateController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getTemplates);
router.get('/default', getDefaultTemplate);

export default router;
