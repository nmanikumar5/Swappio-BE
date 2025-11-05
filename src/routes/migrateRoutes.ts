import { Router } from 'express';
import { migrateHandler } from '../controllers/migrateController.js';

const router = Router();

// Allow GET and POST for convenience. In production a secret is required.
router.get('/', migrateHandler);
router.post('/', migrateHandler);

export default router;
