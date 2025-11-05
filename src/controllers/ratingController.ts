import { Request, Response } from 'express';
import Rating from '../models/Rating.js';
import User from '../models/User.js';
import Listing from '../models/Listing.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, UnauthorizedError, NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { sendSuccess } from '../utils/response.js';

/**
 * @desc    Create a new rating
 * @route   POST /api/ratings
 * @access  Private
 */
export const createRating = asyncHandler(async (req: Request, res: Response) => {
    const { revieweeId, listingId, rating, review, type } = req.body;
    const reviewerId = req.user?.id;

    if (!reviewerId) {
        throw new UnauthorizedError('Authentication required');
    }

    // Validation
    if (!revieweeId || !rating || !type) {
        throw new ValidationError('Reviewee ID, rating, and type are required');
    }

    if (rating < 1 || rating > 5) {
        throw new ValidationError('Rating must be between 1 and 5');
    }

    if (!['buyer', 'seller'].includes(type)) {
        throw new ValidationError('Type must be either buyer or seller');
    }

    // Cannot rate yourself
    if (reviewerId === revieweeId) {
        throw new ValidationError('You cannot rate yourself');
    }

    // Check if reviewee exists
    const reviewee = await User.findById(revieweeId);
    if (!reviewee) {
        throw new NotFoundError('User to be rated not found');
    }

    // Check if listing exists (if provided)
    if (listingId) {
        const listing = await Listing.findById(listingId);
        if (!listing) {
            throw new NotFoundError('Listing not found');
        }
    }

    // Check for duplicate rating
    const existingRating = await Rating.findOne({
        reviewer: reviewerId,
        reviewee: revieweeId,
        listing: listingId || null,
    });

    if (existingRating) {
        throw new ValidationError('You have already rated this user for this transaction');
    }

    // Create rating
    const newRating = await Rating.create({
        reviewer: reviewerId,
        reviewee: revieweeId,
        listing: listingId,
        rating,
        review,
        type,
    });

    // Update user's rating stats
    await updateUserRatingStats(revieweeId);

    const populatedRating = await Rating.findById(newRating._id)
        .populate('reviewer', 'name photo')
        .populate('reviewee', 'name photo')
        .populate('listing', 'title');

    return sendSuccess(res, 201, populatedRating, 'Rating submitted successfully');
});

/**
 * @desc    Get ratings for a user
 * @route   GET /api/ratings/user/:userId
 * @access  Public
 */
export const getUserRatings = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { page = 1, limit = 10, type } = req.query;

    const query: any = { reviewee: userId };
    if (type && ['buyer', 'seller'].includes(type as string)) {
        query.type = type;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [ratings, total] = await Promise.all([
        Rating.find(query)
            .populate('reviewer', 'name photo')
            .populate('listing', 'title images')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Rating.countDocuments(query),
    ]);

    return sendSuccess(res, 200, {
        ratings,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
        },
    });
});

/**
 * @desc    Get user's rating summary
 * @route   GET /api/ratings/user/:userId/summary
 * @access  Public
 */
export const getUserRatingSummary = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const user = await User.findById(userId).select('averageRating totalRatings ratingBreakdown');

    if (!user) {
        throw new NotFoundError('User not found');
    }

    return sendSuccess(res, 200, {
        averageRating: user.averageRating || 0,
        totalRatings: user.totalRatings || 0,
        ratingBreakdown: user.ratingBreakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    });
});

/**
 * @desc    Update a rating
 * @route   PUT /api/ratings/:id
 * @access  Private
 */
export const updateRating = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rating, review } = req.body;
    const userId = req.user?.id;

    if (!userId) {
        throw new UnauthorizedError('Authentication required');
    }

    const existingRating = await Rating.findById(id);
    if (!existingRating) {
        throw new NotFoundError('Rating not found');
    }

    // Check if user is the reviewer
    if (existingRating.reviewer.toString() !== userId) {
        throw new ForbiddenError('You can only update your own ratings');
    }

    // Validate rating value
    if (rating && (rating < 1 || rating > 5)) {
        throw new ValidationError('Rating must be between 1 and 5');
    }

    // Update rating
    if (rating !== undefined) existingRating.rating = rating;
    if (review !== undefined) existingRating.review = review;

    await existingRating.save();

    // Update user's rating stats
    await updateUserRatingStats(existingRating.reviewee.toString());

    const populatedRating = await Rating.findById(existingRating._id)
        .populate('reviewer', 'name photo')
        .populate('reviewee', 'name photo')
        .populate('listing', 'title');

    return sendSuccess(res, 200, populatedRating, 'Rating updated successfully');
});

/**
 * @desc    Delete a rating
 * @route   DELETE /api/ratings/:id
 * @access  Private
 */
export const deleteRating = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
        throw new UnauthorizedError('Authentication required');
    }

    const rating = await Rating.findById(id);
    if (!rating) {
        throw new NotFoundError('Rating not found');
    }

    // Check if user is the reviewer or an admin
    if (rating.reviewer.toString() !== userId && req.user?.role !== 'admin') {
        throw new ForbiddenError('You can only delete your own ratings');
    }

    const revieweeId = rating.reviewee.toString();
    await rating.deleteOne();

    // Update user's rating stats
    await updateUserRatingStats(revieweeId);

    return sendSuccess(res, 200, null, 'Rating deleted successfully');
});

/**
 * @desc    Check if user can rate another user
 * @route   GET /api/ratings/can-rate/:userId
 * @access  Private
 */
export const canRateUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { listingId } = req.query;
    const reviewerId = req.user?.id;

    if (!reviewerId) {
        throw new UnauthorizedError('Authentication required');
    }

    // Check if already rated
    const existingRating = await Rating.findOne({
        reviewer: reviewerId,
        reviewee: userId,
        listing: listingId || null,
    });

    return sendSuccess(res, 200, {
        canRate: !existingRating,
        hasRated: !!existingRating,
        rating: existingRating,
    });
});

/**
 * Helper function to update user's rating statistics
 */
async function updateUserRatingStats(userId: string) {
    const ratings = await Rating.find({ reviewee: userId });

    const totalRatings = ratings.length;
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;

    ratings.forEach((r) => {
        const ratingValue = r.rating;
        breakdown[ratingValue as keyof typeof breakdown]++;
        sum += ratingValue;
    });

    const averageRating = totalRatings > 0 ? sum / totalRatings : 0;

    await User.findByIdAndUpdate(userId, {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalRatings,
        ratingBreakdown: breakdown,
    });
}
