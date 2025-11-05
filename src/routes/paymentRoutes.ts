import { Router } from 'express';
import {
    createOrder,
    verifyPayment,
    getPaymentHistory,
    getAllPayments,
    refundPayment,
} from '../controllers/paymentController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// User payment routes (require authentication)
router.post('/create-order', authenticate, createOrder);
router.post('/verify', authenticate, verifyPayment);
router.get('/history', authenticate, getPaymentHistory);

// Admin payment routes (require admin role)
router.get('/admin/all', authenticate, authorize('admin'), getAllPayments);
router.post('/:id/refund', authenticate, authorize('admin'), refundPayment);

export default router;
