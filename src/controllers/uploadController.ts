import { Request, Response } from 'express';
import { CloudinaryService } from '../services/cloudinaryService';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';

// helper to convert buffer + mimetype to data URI accepted by Cloudinary
function bufferToDataURI(mimetype: string, buffer: Buffer) {
  const base64 = buffer.toString('base64');
  return `data:${mimetype};base64,${base64}`;
}

// @desc    Upload single image
// @route   POST /api/upload/image
// @access  Private
export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  // Support multipart/form-data (req.file) and legacy JSON body { image: '<url or data>' }
  // If multer was used, req.file will be populated (memoryStorage).
  const file = (req as any).file as Express.Multer.File | undefined;
  if (file && file.buffer) {
    const dataUri = bufferToDataURI(file.mimetype || 'application/octet-stream', file.buffer);
    const imageUrl = await CloudinaryService.uploadImage(dataUri, 'swappio/listings');
    sendSuccess(res, 200, { url: imageUrl }, 'Image uploaded successfully');
    return;
  }

  // Fallback: accept JSON body { image: '<data or url>' }
  const { image } = req.body;
  if (!image) {
    throw new ValidationError('Image data is required');
  }

  const imageUrl = await CloudinaryService.uploadImage(image, 'swappio/listings');
  sendSuccess(res, 200, { url: imageUrl }, 'Image uploaded successfully');
});

// @desc    Upload multiple images
// @route   POST /api/upload/images
// @access  Private
export const uploadImages = asyncHandler(async (req: Request, res: Response) => {
  // Support multipart/form-data (req.files) and legacy JSON body { images: [ '<data or url>' ] }
  const files = (req as any).files as Express.Multer.File[] | undefined;
  if (files && files.length > 0) {
    const dataUris = files.map((f) => bufferToDataURI(f.mimetype || 'application/octet-stream', f.buffer));
    const imageUrls = await CloudinaryService.uploadMultipleImages(dataUris, 'swappio/listings');
    sendSuccess(res, 200, { urls: imageUrls }, 'Images uploaded successfully');
    return;
  }

  const { images } = req.body;
  if (!images || !Array.isArray(images) || images.length === 0) {
    throw new ValidationError('Images array is required');
  }

  const imageUrls = await CloudinaryService.uploadMultipleImages(images, 'swappio/listings');
  sendSuccess(res, 200, { urls: imageUrls }, 'Images uploaded successfully');
});
