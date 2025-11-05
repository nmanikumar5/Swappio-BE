import { Router } from 'express';
import { uploadImage, uploadImages } from '../controllers/uploadController.js';
import { authenticate } from '../middleware/auth.js';
import multer from 'multer';

// use memory storage so we can convert buffer to data URI and upload to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = Router();

// Single file field name: 'image'
router.post('/image', authenticate, upload.single('image'), uploadImage);
// Multiple files field name: 'images'
router.post('/images', authenticate, upload.array('images'), uploadImages);

export default router;
