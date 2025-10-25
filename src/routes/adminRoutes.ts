import { Router } from 'express';
import {
  getUsers,
  toggleUserSuspension,
  deleteUser,
  getAllListings,
  toggleListingApproval,
  deleteListing,
  getDashboard,
} from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All routes require admin role
router.use(authenticate, authorize('admin'));

// User management
router.get('/users', getUsers);
router.put('/users/:id/suspend', toggleUserSuspension);
router.delete('/users/:id', deleteUser);

// Listing management
router.get('/listings', getAllListings);
router.put('/listings/:id/approve', toggleListingApproval);
router.delete('/listings/:id', deleteListing);

// Dashboard
router.get('/dashboard', getDashboard);

export default router;
