import { Request, Response } from 'express';
import User from '../models/User';
import Listing from '../models/Listing';
import Report from '../models/Report';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { NotFoundError } from '../utils/errors';

// @desc    Get all users (Admin)
// @route   GET /api/admin/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, search, role } = req.query;

  const query: any = {};
  if (search) {
    query.$or = [
      { name: new RegExp(search as string, 'i') },
      { email: new RegExp(search as string, 'i') },
    ];
  }
  if (role) query.role = role;

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const users = await User.find(query)
    .select('-password')
    .sort('-createdAt')
    .skip(skip)
    .limit(limitNum);

  const total = await User.countDocuments(query);

  sendSuccess(res, 200, {
    users,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Suspend/unsuspend user (Admin)
// @route   PUT /api/admin/users/:id/suspend
// @access  Private/Admin
export const toggleUserSuspension = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    throw new NotFoundError('User not found');
  }

  user.isSuspended = !user.isSuspended;
  await user.save();

  sendSuccess(res, 200, { user }, 
    `User ${user.isSuspended ? 'suspended' : 'unsuspended'} successfully`);
});

// @desc    Delete user (Admin)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    throw new NotFoundError('User not found');
  }

  user.isActive = false;
  await user.save();

  sendSuccess(res, 200, null, 'User deleted successfully');
});

// @desc    Get all listings (Admin)
// @route   GET /api/admin/listings
// @access  Private/Admin
export const getAllListings = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, status } = req.query;

  const query: any = {};
  if (status) query.status = status;

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const listings = await Listing.find(query)
    .populate('ownerId', 'name email')
    .sort('-createdAt')
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

// @desc    Approve/disapprove listing (Admin)
// @route   PUT /api/admin/listings/:id/approve
// @access  Private/Admin
export const toggleListingApproval = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Listing.findById(req.params.id);
  
  if (!listing) {
    throw new NotFoundError('Listing not found');
  }

  listing.isApproved = !listing.isApproved;
  await listing.save();

  sendSuccess(res, 200, { listing }, 
    `Listing ${listing.isApproved ? 'approved' : 'disapproved'} successfully`);
});

// @desc    Delete listing (Admin)
// @route   DELETE /api/admin/listings/:id
// @access  Private/Admin
export const deleteListing = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Listing.findById(req.params.id);
  
  if (!listing) {
    throw new NotFoundError('Listing not found');
  }

  listing.status = 'deleted';
  await listing.save();

  sendSuccess(res, 200, null, 'Listing deleted successfully');
});

// @desc    Get dashboard analytics (Admin)
// @route   GET /api/admin/dashboard
// @access  Private/Admin
export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  // Get counts
  const [totalUsers, totalListings, activeListings, totalReports, pendingReports] = 
    await Promise.all([
      User.countDocuments({ isActive: true }),
      Listing.countDocuments(),
      Listing.countDocuments({ status: 'active' }),
      Report.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
    ]);

  // Get recent activity
  const recentListings = await Listing.find()
    .populate('ownerId', 'name email')
    .sort('-createdAt')
    .limit(5);

  const recentUsers = await User.find({ isActive: true })
    .select('-password')
    .sort('-createdAt')
    .limit(5);

  sendSuccess(res, 200, {
    stats: {
      totalUsers,
      totalListings,
      activeListings,
      totalReports,
      pendingReports,
    },
    recentListings,
    recentUsers,
  });
});
