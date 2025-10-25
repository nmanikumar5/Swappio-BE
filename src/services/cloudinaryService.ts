import cloudinary from '../config/cloudinary';
import { AppError } from '../utils/errors';

export class CloudinaryService {
  static async uploadImage(file: string, folder: string = 'swappio'): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(file, {
        folder,
        resource_type: 'auto',
      });
      return result.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new AppError('Failed to upload image', 500);
    }
  }

  static async uploadMultipleImages(
    files: string[],
    folder: string = 'swappio'
  ): Promise<string[]> {
    try {
      const uploadPromises = files.map((file) =>
        this.uploadImage(file, folder)
      );
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Cloudinary multiple upload error:', error);
      throw new AppError('Failed to upload images', 500);
    }
  }

  static async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new AppError('Failed to delete image', 500);
    }
  }
}
