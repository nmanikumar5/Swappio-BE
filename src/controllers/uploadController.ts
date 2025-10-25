import { Request, Response } from 'express';
import { CloudinaryService } from '../services/cloudinaryService';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';

// @desc    Upload single image
// @route   POST /api/upload/image
// @access  Private
export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
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
  const { images } = req.body;

  if (!images || !Array.isArray(images) || images.length === 0) {
    throw new ValidationError('Images array is required');
  }

  const imageUrls = await CloudinaryService.uploadMultipleImages(images, 'swappio/listings');

  sendSuccess(res, 200, { urls: imageUrls }, 'Images uploaded successfully');
});
