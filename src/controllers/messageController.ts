import { Request, Response } from 'express';
import Message from '../models/Message';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import mongoose from 'mongoose';

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new ForbiddenError('User not authenticated');

  const { receiverId, text, listingId } = req.body;

  const message = await Message.create({
    senderId: user._id,
    receiverId,
    text,
    listingId,
  });

  const populatedMessage = await Message.findById(message._id)
    .populate('senderId', 'name photo')
    .populate('receiverId', 'name photo');

  sendSuccess(res, 201, { message: populatedMessage }, 'Message sent');
});

// @desc    Get conversations for current user
// @route   GET /api/messages/conversations
// @access  Private
export const getConversations = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new ForbiddenError('User not authenticated');

  // Get unique conversations
  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [
          { senderId: new mongoose.Types.ObjectId(user._id.toString()) },
          { receiverId: new mongoose.Types.ObjectId(user._id.toString()) },
        ],
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$senderId', new mongoose.Types.ObjectId(user._id.toString())] },
            '$receiverId',
            '$senderId',
          ],
        },
        lastMessage: { $first: '$$ROOT' },
      },
    },
    {
      $replaceRoot: { newRoot: '$lastMessage' },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'senderId',
        foreignField: '_id',
        as: 'sender',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'receiverId',
        foreignField: '_id',
        as: 'receiver',
      },
    },
    {
      $unwind: '$sender',
    },
    {
      $unwind: '$receiver',
    },
    {
      $project: {
        'sender.password': 0,
        'receiver.password': 0,
      },
    },
  ]);

  sendSuccess(res, 200, { conversations });
});

// @desc    Get messages between two users
// @route   GET /api/messages/:userId
// @access  Private
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new ForbiddenError('User not authenticated');

  const { userId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const messages = await Message.find({
    $or: [
      { senderId: user._id, receiverId: userId },
      { senderId: userId, receiverId: user._id },
    ],
  })
    .populate('senderId', 'name photo')
    .populate('receiverId', 'name photo')
    .sort('createdAt')
    .skip(skip)
    .limit(limitNum);

  // Mark messages as read
  await Message.updateMany(
    { senderId: userId, receiverId: user._id, isRead: false },
    { isRead: true }
  );

  const total = await Message.countDocuments({
    $or: [
      { senderId: user._id, receiverId: userId },
      { senderId: userId, receiverId: user._id },
    ],
  });

  sendSuccess(res, 200, {
    messages,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Get unread message count
// @route   GET /api/messages/unread/count
// @access  Private
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new ForbiddenError('User not authenticated');

  const count = await Message.countDocuments({
    receiverId: user._id,
    isRead: false,
  });

  sendSuccess(res, 200, { count });
});
