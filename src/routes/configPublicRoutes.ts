import express from 'express';
import { getPublicConfigs } from '../controllers/configController';

const router = express.Router();

// Public routes (no authentication required)
router.get('/public', getPublicConfigs);

export default router;
