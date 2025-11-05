import { Request, Response } from 'express';
import Contact from '../models/Contact';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { BadRequestError, NotFoundError } from '../utils/errors';

// @desc    Submit contact form
// @route   POST /api/contact/submit
// @access  Public
export const submitContactForm = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
        throw new BadRequestError('Name, email, subject, and message are required');
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
        throw new BadRequestError('Please provide a valid email address');
    }

    // Validate subject
    const validSubjects = ['general', 'support', 'report', 'feedback', 'partnership'];
    if (!validSubjects.includes(subject)) {
        throw new BadRequestError('Invalid subject type');
    }

    // Validate message length
    if (message.trim().length < 10) {
        throw new BadRequestError('Message must be at least 10 characters long');
    }

    const contact = await Contact.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject,
        message: message.trim(),
        status: 'new',
    });

    sendSuccess(res, 201, { contact }, 'Thank you for your message! We will get back to you soon.');
});

// @desc    Get all contact submissions (Admin)
// @route   GET /api/contact/all
// @access  Private/Admin
export const getAllContacts = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, status, subject } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (subject) query.subject = subject;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const contacts = await Contact.find(query)
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum);

    const total = await Contact.countDocuments(query);

    sendSuccess(res, 200, {
        contacts,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
        },
    });
});

// @desc    Get single contact (Admin)
// @route   GET /api/contact/:id
// @access  Private/Admin
export const getContactById = asyncHandler(async (req: Request, res: Response) => {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
        throw new NotFoundError('Contact submission not found');
    }

    // Mark as read
    if (contact.status === 'new') {
        contact.status = 'read';
        await contact.save();
    }

    sendSuccess(res, 200, { contact });
});

// @desc    Update contact status (Admin)
// @route   PUT /api/contact/:id/status
// @access  Private/Admin
export const updateContactStatus = asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;

    const validStatuses = ['new', 'read', 'in-progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
        throw new BadRequestError('Invalid status');
    }

    const contact = await Contact.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true, runValidators: true }
    );

    if (!contact) {
        throw new NotFoundError('Contact submission not found');
    }

    sendSuccess(res, 200, { contact }, 'Contact status updated successfully');
});

// @desc    Add response to contact (Admin)
// @route   PUT /api/contact/:id/respond
// @access  Private/Admin
export const respondToContact = asyncHandler(async (req: Request, res: Response) => {
    const { response } = req.body;

    if (!response || response.trim().length === 0) {
        throw new BadRequestError('Response message is required');
    }

    const contact = await Contact.findById(req.params.id);

    if (!contact) {
        throw new NotFoundError('Contact submission not found');
    }

    contact.response = response.trim();
    contact.respondedBy = req.user?._id;
    contact.respondedAt = new Date();
    contact.status = 'resolved';

    await contact.save();

    sendSuccess(res, 200, { contact }, 'Response sent successfully');
});

// @desc    Delete contact (Admin)
// @route   DELETE /api/contact/:id
// @access  Private/Admin
export const deleteContact = asyncHandler(async (req: Request, res: Response) => {
    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
        throw new NotFoundError('Contact submission not found');
    }

    sendSuccess(res, 200, null, 'Contact submission deleted successfully');
});

// @desc    Get contact statistics (Admin)
// @route   GET /api/contact/stats
// @access  Private/Admin
export const getContactStats = asyncHandler(async (req: Request, res: Response) => {
    const [total, newCount, readCount, inProgressCount, resolvedCount, closedCount] = await Promise.all([
        Contact.countDocuments(),
        Contact.countDocuments({ status: 'new' }),
        Contact.countDocuments({ status: 'read' }),
        Contact.countDocuments({ status: 'in-progress' }),
        Contact.countDocuments({ status: 'resolved' }),
        Contact.countDocuments({ status: 'closed' }),
    ]);

    const bySubject = await Contact.aggregate([
        {
            $group: {
                _id: '$subject',
                count: { $sum: 1 },
            },
        },
    ]);

    sendSuccess(res, 200, {
        total,
        byStatus: {
            new: newCount,
            read: readCount,
            inProgress: inProgressCount,
            resolved: resolvedCount,
            closed: closedCount,
        },
        bySubject: bySubject.reduce((acc: any, item: any) => {
            acc[item._id] = item.count;
            return acc;
        }, {}),
    });
});
