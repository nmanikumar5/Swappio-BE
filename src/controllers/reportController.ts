import { Request, Response } from 'express';
import { z } from 'zod';
import Report from '../models/Report.js';
import Listing from '../models/Listing.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { sanitizeString } from '../utils/sanitize.js';

// Validation schemas
export const createReportSchema = z.object({
  body: z.object({
    listingId: z.string().min(1, 'Listing ID is required'),
    reason: z.string().min(10).max(500),
  }),
});

// @desc    Report a listing
// @route   POST /api/reports
// @access  Private
export const createReport = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new ForbiddenError('User not authenticated');

  const { listingId, reason } = req.body;
  const sanitizedListingId = sanitizeString(listingId);

  // Check if listing exists
  const listing = await Listing.findById(sanitizedListingId);
  if (!listing) {
    throw new NotFoundError('Listing not found');
  }

  const report = await Report.create({
    listingId: sanitizedListingId,
    reportedBy: user._id,
    reason,
  });

  sendSuccess(res, 201, { report }, 'Report submitted successfully');
});

// @desc    Get all reports (Admin only)
// @route   GET /api/reports
// @access  Private/Admin
export const getReports = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query: any = {};
  if (status) query.status = sanitizeString(status as string);

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const reports = await Report.find(query)
    .populate('listingId', 'title price')
    .populate('reportedBy', 'name email')
    .populate('reviewedBy', 'name')
    .sort('-createdAt')
    .skip(skip)
    .limit(limitNum);

  const total = await Report.countDocuments(query);

  sendSuccess(res, 200, {
    reports,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Update report status (Admin only)
// @route   PUT /api/reports/:id
// @access  Private/Admin
export const updateReport = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new ForbiddenError('User not authenticated');

  const { status, reviewNote } = req.body;

  const report = await Report.findById(req.params.id);
  if (!report) {
    throw new NotFoundError('Report not found');
  }

  if (status) report.status = status;
  if (reviewNote) report.reviewNote = reviewNote;
  report.reviewedBy = user._id;

  await report.save();

  sendSuccess(res, 200, { report }, 'Report updated successfully');
});
