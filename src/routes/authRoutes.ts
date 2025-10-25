import { Router } from 'express';
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  deleteProfile,
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.delete('/profile', authenticate, deleteProfile);

export default router;
