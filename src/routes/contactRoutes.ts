import { Router } from 'express';
import {
    submitContactForm,
    getAllContacts,
    getContactById,
    updateContactStatus,
    respondToContact,
    deleteContact,
    getContactStats,
} from '../controllers/contactController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public route - submit contact form
router.post('/submit', submitContactForm);

// Admin routes - all require authentication and admin role
router.use(authenticate, authorize('admin'));

router.get('/all', getAllContacts);
router.get('/stats', getContactStats);
router.get('/:id', getContactById);
router.put('/:id/status', updateContactStatus);
router.put('/:id/respond', respondToContact);
router.delete('/:id', deleteContact);

export default router;
