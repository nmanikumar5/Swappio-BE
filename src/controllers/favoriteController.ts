import { Request, Response } from 'express';
import { z } from 'zod';
import Favorite from '../models/Favorite';
import Listing from '../models/Listing';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors';

// Validation schemas
export const addFavoriteSchema = z.object({
  body: z.object({
    listingId: z.string().min(1, 'Listing ID is required'),
  }),
});

// @desc    Add listing to favorites
// @route   POST /api/favorites
// @access  Private
export const addFavorite = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new ForbiddenError('User not authenticated');

  const { listingId } = req.body;

  // Check if listing exists
  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new NotFoundError('Listing not found');
  }

  // Check if already favorited
  const existingFavorite = await Favorite.findOne({
    userId: user._id,
    listingId,
  });

  if (existingFavorite) {
    throw new ValidationError('Listing already in favorites');
  }

  const favorite = await Favorite.create({
    userId: user._id,
    listingId,
  });

  sendSuccess(res, 201, { favorite }, 'Added to favorites');
});

// @desc    Remove listing from favorites
// @route   DELETE /api/favorites/:listingId
// @access  Private
export const removeFavorite = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new ForbiddenError('User not authenticated');

  const { listingId } = req.params;

  const favorite = await Favorite.findOneAndDelete({
    userId: user._id,
    listingId,
  });

  if (!favorite) {
    throw new NotFoundError('Favorite not found');
  }

  sendSuccess(res, 200, null, 'Removed from favorites');
});

// @desc    Get user's favorites
// @route   GET /api/favorites
// @access  Private
export const getFavorites = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new ForbiddenError('User not authenticated');

  const favorites = await Favorite.find({ userId: user._id })
    .populate({
      path: 'listingId',
      populate: {
        path: 'ownerId',
        select: 'name photo location',
      },
    })
    .sort('-createdAt');

  sendSuccess(res, 200, { favorites });
});
