import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getProfile,
  updateProfile,
  deleteProfile,
  googleAuth,
  sendPhoneCode,
  verifyPhoneCode,
  checkQuota,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  googleAuthSchema,
  sendPhoneCodeSchema,
  verifyPhoneCodeSchema,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/google', validate(googleAuthSchema), googleAuth);
router.post('/phone/send-code', validate(sendPhoneCodeSchema), sendPhoneCode);
router.post('/phone/verify-code', validate(verifyPhoneCodeSchema), verifyPhoneCode);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.get('/profile', authenticate, getProfile);
router.get('/check-quota', authenticate, checkQuota);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.delete('/profile', authenticate, deleteProfile);

export default router;
