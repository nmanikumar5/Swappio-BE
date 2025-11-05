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

  try {
    // Log the persisted message shape for debugging (stringify to avoid circulars)
    const plain = populatedMessage && typeof (populatedMessage as any).toObject === 'function'
      ? (populatedMessage as any).toObject()
      : populatedMessage;
    // Keep logging concise
    // eslint-disable-next-line no-console
    console.log('[DEBUG] sendMessage persisted:', JSON.stringify(plain, null, 2));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[DEBUG] sendMessage logging failed', e);
  }

  sendSuccess(res, 201, { message: populatedMessage }, 'Message sent');
});

// @desc    Get conversations for current user
// @route   GET /api/messages/conversations
// @access  Private
export const getConversations = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new ForbiddenError('User not authenticated');

  // Get unique conversations
  const userObjectId = new mongoose.Types.ObjectId(user._id.toString());

  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [
          { senderId: userObjectId },
          { receiverId: userObjectId },
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
            { $eq: ['$senderId', userObjectId] },
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
    // populate listing details (if any)
    {
      $lookup: {
        from: 'listings',
        localField: 'listingId',
        foreignField: '_id',
        as: 'listing',
      },
    },
    { $unwind: '$sender' },
    { $unwind: '$receiver' },
    { $unwind: { path: '$listing', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        'sender.password': 0,
        'sender.passwordHash': 0,
        'receiver.password': 0,
        'receiver.passwordHash': 0,
      },
    },
  ]);

  sendSuccess(res, 200, {
    conversations: conversations.map(c => ({
      // _id: c._id,
      id: c._id,
      sender: c.sender,
      receiver: c.receiver,
      text: c.text,
      createdAt: c.createdAt,
    }))
  });
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
    // fetch newest messages first so page=1 returns the latest
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // messages currently come back newest->oldest; reverse to send oldest->newest
  const orderedMessages = messages.slice().reverse();

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
    messages: orderedMessages,
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
