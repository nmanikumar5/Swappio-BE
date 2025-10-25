import { Router } from 'express';
import {
  createReport,
  getReports,
  updateReport,
  createReportSchema,
} from '../controllers/reportController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.post('/', authenticate, validate(createReportSchema), createReport);
router.get('/', authenticate, authorize('admin'), getReports);
router.put('/:id', authenticate, authorize('admin'), updateReport);

export default router;
