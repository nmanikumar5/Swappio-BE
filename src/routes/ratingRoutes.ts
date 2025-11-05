import express from 'express';
import {
    createRating,
    getUserRatings,
    getUserRatingSummary,
    updateRating,
    deleteRating,
    canRateUser,
} from '../controllers/ratingController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/user/:userId', getUserRatings);
router.get('/user/:userId/summary', getUserRatingSummary);

// Protected routes
router.use(authenticate);
router.post('/', createRating);
router.put('/:id', updateRating);
router.delete('/:id', deleteRating);
router.get('/can-rate/:userId', canRateUser);

export default router;
