import { Router } from 'express';
import { uploadImage, uploadImages } from '../controllers/uploadController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/image', authenticate, uploadImage);
router.post('/images', authenticate, uploadImages);

export default router;
