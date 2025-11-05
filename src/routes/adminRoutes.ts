import { Router } from 'express';
import {
  getUsers,
  toggleUserSuspension,
  deleteUser,
  getAllListings,
  approveListing,
  rejectListing,
  toggleListingApproval,
  deleteListing,
  getDashboard,
  getPricingConfig,
  updatePricingConfig,
  getDashboardStats,
  getPaymentPlans,
  createPaymentPlan,
  updatePaymentPlan,
  deletePaymentPlan,
  seedDemoData,
} from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All routes require admin role
router.use(authenticate, authorize('admin'));

// User management
router.get('/users', getUsers);
router.put('/users/:id/suspend', toggleUserSuspension);
router.delete('/users/:id', deleteUser);

// Listing management
router.get('/listings', getAllListings);
router.put('/listings/:id/approve', approveListing);
router.put('/listings/:id/reject', rejectListing);
router.put('/listings/:id/toggle-approval', toggleListingApproval); // Deprecated
router.delete('/listings/:id', deleteListing);

// Dashboard
router.get('/dashboard', getDashboard);
router.get('/stats', getDashboardStats);

// Pricing configuration
router.get('/pricing-config', getPricingConfig);
router.put('/pricing-config', updatePricingConfig);

// Payment plans management
router.get('/payment-plans', getPaymentPlans);
router.post('/payment-plans', createPaymentPlan);
router.put('/payment-plans/:id', updatePaymentPlan);
router.delete('/payment-plans/:id', deletePaymentPlan);

// Dev-only seeding endpoint
router.post('/seed-demo', seedDemoData);

export default router;
