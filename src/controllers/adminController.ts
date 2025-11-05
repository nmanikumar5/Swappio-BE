import { Request, Response } from 'express';
import User from '../models/User.js';
import Listing from '../models/Listing.js';
import Report from '../models/Report.js';
import Payment from '../models/Payment.js';
import PricingConfig from '../models/PricingConfig.js';
import PaymentPlan from '../models/PaymentPlan.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { createSafeRegex, sanitizeString } from '../utils/sanitize.js';

// @desc    Get all users (Admin)
// @route   GET /api/admin/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, search, role } = req.query;

  const query: any = {};
  if (search) {
    const sanitizedSearch = sanitizeString(search as string);
    query.$or = [
      { name: createSafeRegex(sanitizedSearch) },
      { email: createSafeRegex(sanitizedSearch) },
    ];
  }
  if (role) query.role = sanitizeString(role as string);

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
  const { page = 1, limit = 20, status, approvalStatus } = req.query;

  const query: any = {};
  if (status) query.status = sanitizeString(status as string);
  if (approvalStatus) query.approvalStatus = sanitizeString(approvalStatus as string);

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const listings = await Listing.find(query)
    .populate('ownerId', 'name email')
    .populate('approvedBy', 'name email')
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

// @desc    Approve listing (Admin)
// @route   PUT /api/admin/listings/:id/approve
// @access  Private/Admin
export const approveListing = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    throw new NotFoundError('Listing not found');
  }

  listing.approvalStatus = 'approved';
  listing.isApproved = true; // Backwards compatibility
  listing.approvedBy = req.user?._id;
  listing.approvedAt = new Date();
  listing.rejectionReason = undefined;
  await listing.save();

  sendSuccess(res, 200, { listing }, 'Listing approved successfully');
});

// @desc    Reject listing (Admin)
// @route   PUT /api/admin/listings/:id/reject
// @access  Private/Admin
export const rejectListing = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body;
  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    throw new NotFoundError('Listing not found');
  }

  listing.approvalStatus = 'rejected';
  listing.isApproved = false; // Backwards compatibility
  listing.rejectionReason = reason || 'Does not meet community guidelines';
  listing.approvedBy = req.user?._id;
  listing.approvedAt = new Date();
  await listing.save();

  sendSuccess(res, 200, { listing }, 'Listing rejected successfully');
});

// @desc    Toggle listing approval (Admin) - Deprecated
// @route   PUT /api/admin/listings/:id/toggle-approval
// @access  Private/Admin
export const toggleListingApproval = asyncHandler(async (req: Request, res: Response) => {
  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    throw new NotFoundError('Listing not found');
  }

  if (listing.approvalStatus === 'approved' || listing.approvalStatus === 'rejected') {
    listing.approvalStatus = 'pending';
    listing.isApproved = false;
    listing.rejectionReason = undefined;
  } else {
    listing.approvalStatus = 'approved';
    listing.isApproved = true;
    listing.approvedBy = req.user?._id;
    listing.approvedAt = new Date();
  }

  await listing.save();

  sendSuccess(res, 200, { listing },
    `Listing ${listing.approvalStatus} successfully`);
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
  const [
    totalUsers,
    totalListings,
    activeListings,
    pendingApproval,
    approvedListings,
    rejectedListings,
    totalReports,
    pendingReports
  ] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Listing.countDocuments(),
    Listing.countDocuments({ status: 'active', approvalStatus: 'approved' }),
    Listing.countDocuments({ approvalStatus: 'pending' }),
    Listing.countDocuments({ approvalStatus: 'approved' }),
    Listing.countDocuments({ approvalStatus: 'rejected' }),
    Report.countDocuments(),
    Report.countDocuments({ status: 'pending' }),
  ]);

  // Get recent activity
  const recentListings = await Listing.find()
    .populate('ownerId', 'name email')
    .populate('approvedBy', 'name email')
    .sort('-createdAt')
    .limit(5);

  const recentUsers = await User.find({ isActive: true })
    .select('-password')
    .sort('-createdAt')
    .limit(5);

  // Get pending listings for approval
  const pendingListings = await Listing.find({ approvalStatus: 'pending' })
    .populate('ownerId', 'name email')
    .sort('-createdAt')
    .limit(10);

  sendSuccess(res, 200, {
    stats: {
      totalUsers,
      totalListings,
      activeListings,
      pendingApproval,
      approvedListings,
      rejectedListings,
      totalReports,
      pendingReports,
    },
    recentListings,
    recentUsers,
    pendingListings,
  });
});

// @desc    Get pricing configuration
// @route   GET /api/admin/pricing-config
// @access  Private/Admin
export const getPricingConfig = asyncHandler(async (req: Request, res: Response) => {
  let config = await PricingConfig.findOne({ isActive: true });

  if (!config) {
    // Create default config if none exists
    config = await PricingConfig.create({
      freeAdsPerMonth: 10,
      freeAdDuration: 30,
      featuredAdPrice: 99,
      featuredAdDuration: 7,
      premiumAdPrice: 199,
      premiumAdDuration: 15,
      platinumAdPrice: 399,
      platinumAdDuration: 30,
      additionalAdPrice: 49,
      taxPercentage: 18,
      platformFee: 0,
      razorpayEnabled: true,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
      stripeEnabled: false,
      stripePublishableKey: '',
      isActive: true,
      updatedBy: req.user?._id,
    });
  }

  sendSuccess(res, 200, config, 'Pricing configuration retrieved successfully');
});

// @desc    Update pricing configuration
// @route   PUT /api/admin/pricing-config
// @access  Private/Admin
export const updatePricingConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = await PricingConfig.findOneAndUpdate(
    { isActive: true },
    {
      ...req.body,
      updatedBy: req.user?._id,
      updatedAt: new Date(),
    },
    { new: true, upsert: true, runValidators: true }
  );

  sendSuccess(res, 200, config, 'Pricing configuration updated successfully');
});

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Get all stats in parallel
  const [
    totalUsers,
    activeUsers,
    newUsersThisMonth,
    totalListings,
    activeListings,
    pendingListings,
    totalPaymentsCount,
    paymentsThisMonth,
    revenueStats,
    lastMonthRevenueStats
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true, isSuspended: false }),
    User.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
    Listing.countDocuments(),
    Listing.countDocuments({ status: 'active', approvalStatus: 'approved' }),
    Listing.countDocuments({ approvalStatus: 'pending' }),
    Payment.countDocuments({ status: 'success' }),
    Payment.countDocuments({ status: 'success', createdAt: { $gte: firstDayOfMonth } }),
    Payment.aggregate([
      { $match: { status: 'success', createdAt: { $gte: firstDayOfMonth } } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]),
    Payment.aggregate([
      {
        $match: {
          status: 'success',
          createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ])
  ]);

  const thisMonthRevenue = revenueStats[0]?.total || 0;
  const lastMonthRevenue = lastMonthRevenueStats[0]?.total || 0;
  const growth = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : thisMonthRevenue > 0 ? 100 : 0;

  sendSuccess(res, 200, {
    revenue: {
      total: thisMonthRevenue / 100, // Convert paise to rupees
      thisMonth: thisMonthRevenue / 100,
      growth: Math.round(growth * 10) / 10
    },
    users: {
      total: totalUsers,
      active: activeUsers,
      new: newUsersThisMonth
    },
    listings: {
      total: totalListings,
      active: activeListings,
      pending: pendingListings
    },
    payments: {
      total: totalPaymentsCount,
      thisMonth: paymentsThisMonth,
      pending: 0 // Can add pending payment logic if needed
    }
  }, 'Dashboard statistics retrieved successfully');
});

// @desc    Get all payment plans
// @route   GET /api/admin/payment-plans
// @access  Private/Admin
export const getPaymentPlans = asyncHandler(async (req: Request, res: Response) => {
  const { type, isActive } = req.query;

  const query: any = {};
  if (type) query.type = sanitizeString(type as string);
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const plans = await PaymentPlan.find(query).sort('-createdAt');

  sendSuccess(res, 200, { plans }, 'Payment plans retrieved successfully');
});

// @desc    Create payment plan
// @route   POST /api/admin/payment-plans
// @access  Private/Admin
export const createPaymentPlan = asyncHandler(async (req: Request, res: Response) => {
  const { name, type, description, price, currency, numberOfDays, adsPerMonth, credits, features, isActive, priorityLevel, adBoost } = req.body;

  if (!name || !type || !description || price === undefined) {
    throw new BadRequestError('Name, type, description, and price are required');
  }

  const plan = await PaymentPlan.create({
    name,
    type,
    description,
    price,
    currency: currency || 'INR',
    numberOfDays,
    adsPerMonth,
    credits,
    features: features || [],
    isActive: isActive !== undefined ? isActive : true,
    priorityLevel,
    adBoost,
  });

  sendSuccess(res, 201, { plan }, 'Payment plan created successfully');
});

// @desc    Update payment plan
// @route   PUT /api/admin/payment-plans/:id
// @access  Private/Admin
export const updatePaymentPlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, type, description, price, currency, numberOfDays, adsPerMonth, credits, features, isActive, priorityLevel, adBoost } = req.body;

  const plan = await PaymentPlan.findById(id);
  if (!plan) {
    throw new NotFoundError('Payment plan not found');
  }

  if (name !== undefined) plan.name = name;
  if (type !== undefined) plan.type = type;
  if (description !== undefined) plan.description = description;
  if (price !== undefined) plan.price = price;
  if (currency !== undefined) plan.currency = currency;
  if (numberOfDays !== undefined) plan.numberOfDays = numberOfDays;
  if (adsPerMonth !== undefined) plan.adsPerMonth = adsPerMonth;
  if (credits !== undefined) plan.credits = credits;
  if (features !== undefined) plan.features = features;
  if (isActive !== undefined) plan.isActive = isActive;
  if (priorityLevel !== undefined) plan.priorityLevel = priorityLevel;
  if (adBoost !== undefined) plan.adBoost = adBoost;

  await plan.save();

  sendSuccess(res, 200, { plan }, 'Payment plan updated successfully');
});

// @desc    Delete payment plan
// @route   DELETE /api/admin/payment-plans/:id
// @access  Private/Admin
export const deletePaymentPlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const plan = await PaymentPlan.findById(id);
  if (!plan) {
    throw new NotFoundError('Payment plan not found');
  }

  await plan.deleteOne();

  sendSuccess(res, 200, {}, 'Payment plan deleted successfully');
});

// @desc    Seed demo data for admin dashboard (DEV only)
// @route   POST /api/admin/seed-demo
// @access  Private/Admin (non-production only)
export const seedDemoData = asyncHandler(async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    throw new BadRequestError('Seeding is disabled in production');
  }

  // Create or find admin
  let admin = await User.findOne({ email: 'admin@example.com' });
  if (!admin) {
    admin = await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
      password: 'admin123',
      isActive: true,
    } as any);
  }

  // Create or find a demo user
  let user = await User.findOne({ email: 'john@example.com' });
  if (!user) {
    user = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      isActive: true,
      role: 'user',
      location: 'Mumbai, India',
    } as any);
  }

  // Ensure some listings
  const listingsCount = await Listing.countDocuments({ ownerId: user._id });
  const createdListings: any[] = [];
  if (listingsCount < 3) {
    const baseImages = ['https://via.placeholder.com/400x300'];
    const toCreate = [
      {
        title: 'iPhone 14 Pro',
        description: 'Excellent condition, all accessories included',
        price: 75000,
        category: 'Electronics',
        location: 'Mumbai, India',
        images: baseImages,
        ownerId: user._id,
        approvalStatus: 'pending',
        status: 'active',
        views: 45,
      },
      {
        title: 'Mountain Bike',
        description: 'Trek brand, 1 year old, well maintained',
        price: 25000,
        category: 'Sports',
        location: 'Bangalore, India',
        images: baseImages,
        ownerId: user._id,
        approvalStatus: 'approved',
        isApproved: true,
        approvedBy: admin._id,
        approvedAt: new Date(),
        status: 'active',
        views: 120,
      },
      {
        title: 'Vintage Watch',
        description: 'Rolex Submariner, needs restoration',
        price: 150000,
        category: 'Accessories',
        location: 'Delhi, India',
        images: baseImages,
        ownerId: user._id,
        approvalStatus: 'rejected',
        isApproved: false,
        rejectionReason: 'Does not meet community guidelines',
        approvedBy: admin._id,
        approvedAt: new Date(),
        status: 'active',
        views: 200,
      },
    ];
    for (const doc of toCreate) {
      const l = await Listing.create(doc as any);
      createdListings.push(l);
    }
  }

  // Ensure some payments
  const paymentsCount = await Payment.countDocuments({ userId: user._id });
  const createdPayments: any[] = [];
  if (paymentsCount < 2) {
    const makeTxnId = () => `RZP_TEST_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const common = {
      userId: user._id,
      currency: 'INR',
      gateway: 'razorpay',
      paymentMethod: 'card',
      type: 'listing_priority' as const,
      description: 'Featured Listing',
      metadata: {},
    };
    const pay1 = await Payment.create({
      ...common,
      amount: 500000, // ₹5000 in paise
      status: 'success',
      gatewayTransactionId: makeTxnId(),
      gatewayOrderId: makeTxnId(),
      gatewayPaymentId: makeTxnId(),
      paidAt: new Date(),
    } as any);
    const pay2 = await Payment.create({
      ...common,
      amount: 250000, // ₹2500 in paise
      status: 'pending',
      gatewayTransactionId: makeTxnId(),
      gatewayOrderId: makeTxnId(),
      gatewayPaymentId: makeTxnId(),
    } as any);
    createdPayments.push(pay1, pay2);
  }

  sendSuccess(res, 200, {
    admin: { id: admin._id, email: admin.email },
    user: { id: user._id, email: user.email },
    createdListings: createdListings.length,
    createdPayments: createdPayments.length,
  }, 'Demo data seeded');
});

