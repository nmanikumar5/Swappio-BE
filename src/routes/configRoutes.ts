import { Router } from 'express';
import {
    getAllConfigs,
    getConfigByKey,
    createConfig,
    updateConfig,
    deleteConfig,
    getConfigsByCategory,
    seedDefaultConfigs,
} from '../controllers/configController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All routes require admin authentication
router.use(authenticate, authorize('admin'));

// Seed default configurations
router.post('/seed', seedDefaultConfigs);

// Get all configurations
router.get('/', getAllConfigs);

// Get configurations by category
router.get('/category/:category', getConfigsByCategory);

// Get configuration by key
router.get('/:key', getConfigByKey);

// Create configuration
router.post('/', createConfig);

// Update configuration
router.put('/:key', updateConfig);

// Delete configuration (soft delete)
router.delete('/:key', deleteConfig);

export default router;
