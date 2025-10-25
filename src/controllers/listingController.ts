import { Request, Response } from 'express';
import { z } from 'zod';
import Listing from '../models/Listing';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';

// Validation schemas
export const createListingSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(100),
    description: z.string().min(10).max(2000),
    price: z.number().min(0),
    category: z.string().min(1),
    location: z.string().min(1),
    images: z.array(z.string().url()).optional(),
  }),
});

export const updateListingSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(100).optional(),
    description: z.string().min(10).max(2000).optional(),
    price: z.number().min(0).optional(),
    category: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    images: z.array(z.string().url()).optional(),
    status: z.enum(['active', 'sold', 'deleted']).optional(),
  }),
});

// @desc    Create a new listing
// @route   POST /api/listings
// @access  Private
export const createListing = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new ForbiddenError('User not authenticated');

  const { title, description, price, category, location, images } = req.body;

  const listing = await Listing.create({
    title,
    description,
    price,
    category,
    location,
    images: images || [],
    ownerId: user._id,
  });

  sendSuccess(res, 201, { listing }, 'Listing created successfully');
});

// @desc    Get all listings with filters and pagination
// @route   GET /api/listings
// @access  Public
export const getListings = asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    minPrice,
    maxPrice,
    location,
    keyword,
    status = 'active',
    sort = '-createdAt',
    page = 1,
    limit = 20,
  } = req.query;

  // Build query
  const query: any = { status };

  if (category) query.category = category;
  if (location) query.location = new RegExp(location as string, 'i');
  
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  if (keyword) {
    query.$text = { $search: keyword as string };
  }

  // Pagination
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  // Execute query
  const listings = await Listing.find(query)
    .populate('ownerId', 'name photo location')
    .sort(sort as string)
    .skip(skip)
    .limit(limitNum);

  const total = await Listing.countDocuments(query);

  sendSuccess(res, 200, {
    listings,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Get single listing by ID
// @route   GET /api/listings/:id
// @access  Public
export const getListing = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Listing.findById(req.params.id)
    .populate('ownerId', 'name email phone photo location');

  if (!listing) {
    throw new NotFoundError('Listing not found');
  }

  // Increment views
  listing.views += 1;
  await listing.save();

  sendSuccess(res, 200, { listing });
});

// @desc    Update listing
// @route   PUT /api/listings/:id
// @access  Private
export const updateListing = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new ForbiddenError('User not authenticated');

  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    throw new NotFoundError('Listing not found');
  }

  // Check ownership or admin
  if (listing.ownerId.toString() !== user._id.toString() && user.role !== 'admin') {
    throw new ForbiddenError('Not authorized to update this listing');
  }

  const { title, description, price, category, location, images, status } = req.body;

  if (title !== undefined) listing.title = title;
  if (description !== undefined) listing.description = description;
  if (price !== undefined) listing.price = price;
  if (category !== undefined) listing.category = category;
  if (location !== undefined) listing.location = location;
  if (images !== undefined) listing.images = images;
  if (status !== undefined) listing.status = status;

  await listing.save();

  sendSuccess(res, 200, { listing }, 'Listing updated successfully');
});

// @desc    Delete listing
// @route   DELETE /api/listings/:id
// @access  Private
export const deleteListing = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new ForbiddenError('User not authenticated');

  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    throw new NotFoundError('Listing not found');
  }

  // Check ownership or admin
  if (listing.ownerId.toString() !== user._id.toString() && user.role !== 'admin') {
    throw new ForbiddenError('Not authorized to delete this listing');
  }

  // Soft delete
  listing.status = 'deleted';
  await listing.save();

  sendSuccess(res, 200, null, 'Listing deleted successfully');
});

// @desc    Get user's own listings
// @route   GET /api/listings/my
// @access  Private
export const getMyListings = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new ForbiddenError('User not authenticated');

  const listings = await Listing.find({ ownerId: user._id })
    .sort('-createdAt');

  sendSuccess(res, 200, { listings });
});
