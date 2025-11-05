import { Router } from 'express';
import {
  createReport,
  getReports,
  updateReport,
  createReportSchema,
} from '../controllers/reportController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/', authenticate, validate(createReportSchema), createReport);
router.get('/', authenticate, authorize('admin'), getReports);
router.put('/:id', authenticate, authorize('admin'), updateReport);

export default router;
