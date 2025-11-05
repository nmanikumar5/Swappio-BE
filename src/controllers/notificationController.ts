import { Request, Response } from 'express';
import Notification from '../models/Notification';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { ForbiddenError } from '../utils/errors';

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ForbiddenError('Not authenticated');
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'name photo');

    const total = await Notification.countDocuments({ userId: user._id });

    sendSuccess(res, 200, { notifications, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ForbiddenError('Not authenticated');
    const { id } = req.params;
    await Notification.updateOne({ _id: id, userId: user._id }, { read: true });
    sendSuccess(res, 200, { success: true });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ForbiddenError('Not authenticated');
    await Notification.updateMany({ userId: user._id, read: false }, { read: true });
    sendSuccess(res, 200, { success: true });
});
