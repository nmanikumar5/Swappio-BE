import { Request, Response } from 'express';
import { z } from 'zod';
import Listing from '../models/Listing';
import Favorite from '../models/Favorite';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { createSafeRegex, sanitizeString } from '../utils/sanitize';

// Validation schemas
export const createListingSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(100),
    description: z.string().min(3).max(2000),
    price: z.number().min(0),
    category: z.string().min(1),
    location: z.string().min(1),
    // Allow long image strings (URLs, data URIs, local paths). Max length per image: 5000 chars.
    images: z.array(z.string().max(5000)).optional(),
  }),
});

export const updateListingSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(100).optional(),
    description: z.string().min(3).max(2000).optional(),
    price: z.number().min(0).optional(),
    category: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    // Allow long image strings (URLs, data URIs, local paths). Max length per image: 5000 chars.
    images: z.array(z.string().max(5000)).optional(),
    status: z.enum(['active', 'sold', 'deleted']).optional(),
  }),
});

// @desc    Create a new listing
// @route   POST /api/listings
// @access  Private
export const createListing = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new ForbiddenError('User not authenticated');

  const { title, description, price, category, location, images, priority } = req.body;

  // Check if this is a free ad or paid ad
  // Free ads are 'standard' priority, paid ads are 'featured', 'premium', or 'platinum'
  const isPaidAd = priority && priority !== 'standard';

  // If it's a free ad (standard priority or no priority), increment the quota counter
  if (!isPaidAd) {
    // Fetch full user to update quota
    const User = require('../models/User').default;
    const fullUser = await User.findById(user._id);

    if (!fullUser) throw new ForbiddenError('User not found');

    // Reset quota if needed (monthly reset)
    const now = new Date();
    const lastReset = fullUser.lastQuotaReset ? new Date(fullUser.lastQuotaReset) : null;
    const needsReset = !lastReset ||
      (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear());

    if (needsReset) {
      fullUser.freeAdsUsedThisMonth = 0;
      fullUser.lastQuotaReset = now;
    }

    // Check quota
    const freeAdsRemaining = Math.max(0, fullUser.freeAdsQuota - fullUser.freeAdsUsedThisMonth);
    if (freeAdsRemaining <= 0) {
      throw new ForbiddenError('Free ads quota exhausted. Please upgrade or purchase credits.');
    }

    // Increment the counter
    fullUser.freeAdsUsedThisMonth += 1;
    await fullUser.save();

    console.log(`[QUOTA] User ${fullUser.email} posted free ad. Used: ${fullUser.freeAdsUsedThisMonth}/${fullUser.freeAdsQuota}`);
  }

  const listing = await Listing.create({
    title,
    description,
    price,
    category,
    location,
    images: images || [],
    ownerId: user._id,
    approvalStatus: 'pending', // All new listings require approval
    isApproved: false,
    priority: priority || 'standard',
    isPaid: isPaidAd,
    paymentStatus: isPaidAd ? 'paid' : 'free',
  });

  sendSuccess(res, 201, { listing }, 'Listing created successfully. Awaiting admin approval.');
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
    search,
    condition,
    sortBy,
    sortOrder,
    status = 'active',
    sort = '-createdAt',
    page = 1,
    limit = 20,
  } = req.query;

  // Build query
  const query: any = { status: sanitizeString(status as string) };

  // Only show approved listings to non-admin users
  if (!req.user || (req.user as any).role !== 'admin') {
    query.approvalStatus = 'approved';
  }

  if (category) query.category = sanitizeString(category as string);
  // Make location matching more flexible - case insensitive partial match
  if (location) {
    const locStr = sanitizeString(location as string);
    if (locStr) {
      query.location = createSafeRegex(locStr);
    }
  }

  // Advanced filters
  if (condition) query.condition = sanitizeString(condition as string);

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // Support both keyword and search parameters
  const searchTerm = search || keyword;
  if (searchTerm) {
    query.$text = { $search: sanitizeString(searchTerm as string) };
  }

  // Pagination
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  // Use aggregation to return listings with owner, favorite count and isFavorite (if user present) in one query
  // Convert sort string like '-createdAt' to sort object
  let sortField = String(sort || '-createdAt');

  // Handle advanced sorting
  if (sortBy) {
    const order = sortOrder === 'asc' ? 1 : -1;
    sortField = `${order === -1 ? '-' : ''}${sortBy}`;
  }

  const sortObj: Record<string, number> = {};
  if (sortField.startsWith('-')) sortObj[sortField.slice(1)] = -1;
  else sortObj[sortField.replace(/^-/, '')] = 1;

  const userId = req.user ? (req.user as any)._id : null;

  // build data pipeline with conditional userFav lookup only when authenticated
  const dataPipeline: any[] = [
    // owner lookup
    {
      $lookup: {
        from: 'users',
        localField: 'ownerId',
        foreignField: '_id',
        as: 'owner',
      },
    },
    { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
    // favorites count lookup
    {
      $lookup: {
        from: 'favorites',
        let: { lid: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$listingId', '$$lid'] } } },
          { $count: 'count' },
        ],
        as: 'favAgg',
      },
    },
  ];

  if (userId) {
    dataPipeline.push({
      $lookup: {
        from: 'favorites',
        let: { lid: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$listingId', '$$lid'] }, { $eq: ['$userId', new mongoose.Types.ObjectId(userId)] }] } } },
          { $limit: 1 },
        ],
        as: 'userFav',
      },
    });
    dataPipeline.push({
      $addFields: {
        favoriteCount: { $ifNull: [{ $arrayElemAt: ['$favAgg.count', 0] }, 0] },
        isFavorite: { $gt: [{ $size: '$userFav' }, 0] },
      },
    });
  } else {
    dataPipeline.push({
      $addFields: {
        favoriteCount: { $ifNull: [{ $arrayElemAt: ['$favAgg.count', 0] }, 0] },
        isFavorite: false,
      },
    });
  }

  // project desired fields (include owner fields under ownerId for compatibility)
  dataPipeline.push({
    $project: {
      title: 1,
      description: 1,
      price: 1,
      category: 1,
      location: 1,
      images: 1,
      ownerId: '$owner',
      status: 1,
      views: 1,
      createdAt: 1,
      updatedAt: 1,
      favoriteCount: 1,
      isFavorite: 1,
    },
  });

  // assemble full aggregation with facet for pagination
  const facetPipeline: any[] = [
    { $match: query },
    { $sort: sortObj },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [...dataPipeline, { $skip: skip }, { $limit: limitNum }],
      },
    },
  ];

  const aggRes = await Listing.aggregate(facetPipeline);
  const metadata = aggRes[0]?.metadata?.[0] || { total: 0 };
  const data = aggRes[0]?.data || [];

  sendSuccess(res, 200, {
    listings: data.map((d: any) => ({ ...d, id: d._id })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: metadata.total || 0,
      pages: Math.ceil((metadata.total || 0) / limitNum),
    },
  });
});

// @desc    Suggest listings for autosuggest (lightweight)
// @route   GET /api/listings/suggest
// @access  Public
export const suggestListings = asyncHandler(async (req: Request, res: Response) => {
  const { keyword = '', limit = 5 } = req.query;
  const lim = Math.max(1, Math.min(50, Number(limit) || 5));
  const q: any = { status: 'active' };
  if (keyword && String(keyword).trim()) {
    const k = sanitizeString(String(keyword));
    // prefer text index if available, otherwise fallback to regex
    if ((Listing.collection as any).stats) {
      q.$text = { $search: k };
    } else {
      q.title = createSafeRegex(k);
    }
  }

  const docs = await Listing.find(q)
    .sort({ createdAt: -1 })
    .limit(lim)
    .select('title images category')
    .lean();

  // map to lightweight shape
  const suggestions = docs.map((d: any) => ({ id: d._id, title: d.title, image: Array.isArray(d.images) && d.images.length ? d.images[0] : null, category: d.category }));

  sendSuccess(res, 200, { listings: suggestions });
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

  // enrich with favorite info using aggregation for consistency
  const countsAgg = await Favorite.aggregate([
    { $match: { listingId: listing._id } },
    { $group: { _id: '$listingId', count: { $sum: 1 } } },
  ]);
  const favCount = countsAgg[0]?.count || 0;
  let isFavorite = false;
  if ((req as any).user) {
    isFavorite = !!(await Favorite.exists({ listingId: listing._id, userId: (req as any).user._id }));
  }

  sendSuccess(res, 200, { listing: { ...listing.toObject(), favoriteCount: favCount, isFavorite: Boolean(isFavorite) } });
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

  // batch counts for my listings
  const listingIds = listings.map((l) => l._id);
  const countsAgg2 = await Favorite.aggregate([
    { $match: { listingId: { $in: listingIds } } },
    { $group: { _id: '$listingId', count: { $sum: 1 } } },
  ]);
  const countsMap: Record<string, number> = {};
  countsAgg2.forEach((c: any) => { countsMap[String(c._id)] = c.count; });

  // compute whether current user favorited each listing
  const userFavs = await Favorite.find({ listingId: { $in: listingIds }, userId: user._id }).select('listingId');
  const userFavSet = new Set<string>();
  userFavs.forEach((f) => userFavSet.add(String((f.listingId as any)._id || f.listingId)));

  const listingObjs = listings.map((listing) => {
    const obj = listing.toObject();
    const favCount = countsMap[String(listing._id)] || 0;
    const isFavorite = userFavSet.has(String(listing._id));
    return {
      ...obj,
      id: listing._id,
      favoriteCount: favCount,
      isFavorite,
    };
  });

  sendSuccess(res, 200, { listings: listingObjs });
});
