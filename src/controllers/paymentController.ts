import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment from '../models/Payment';
import User from '../models/User';
import Listing from '../models/Listing';
import PricingConfig from '../models/PricingConfig';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { BadRequestError, NotFoundError } from '../utils/errors';

// Initialize Razorpay (will be configured from env)
const getRazorpayInstance = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error('Razorpay credentials not configured');
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
};

// @desc    Create Razorpay order for payment
// @route   POST /api/payments/create-order
// @access  Private
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
    const {
        type,
        priorityLevel,
        duration,
        creditsPurchased,
        listingId,
    } = req.body;

    const userId = req.user?.id;
    const user = await User.findById(userId);

    if (!user) {
        throw new NotFoundError('User not found');
    }

    // Get active pricing config
    const pricingConfig = await PricingConfig.findOne({ isActive: true });
    if (!pricingConfig) {
        throw new NotFoundError('Pricing configuration not found');
    }

    // Calculate amount based on type
    let amount = 0;
    let description = '';
    let paymentType: 'listing_priority' | 'ad_credits' | 'subscription' | 'additional_ad' = 'additional_ad';

    switch (type) {
        case 'single_ad':
            amount = pricingConfig.additionalAdPrice;
            description = 'Single Additional Ad';
            paymentType = 'additional_ad';
            break;

        case 'featured':
            amount = pricingConfig.featuredAdPrice;
            description = `Featured Ad (${pricingConfig.featuredAdDuration} days)`;
            paymentType = 'listing_priority';
            break;

        case 'premium':
            amount = pricingConfig.premiumAdPrice;
            description = `Premium Ad (${pricingConfig.premiumAdDuration} days)`;
            paymentType = 'listing_priority';
            break;

        case 'platinum':
            amount = pricingConfig.platinumAdPrice;
            description = `Platinum Ad (${pricingConfig.platinumAdDuration} days)`;
            paymentType = 'listing_priority';
            break;

        case 'bulk_package':
            const packageIndex = req.body.packageIndex;
            if (packageIndex !== undefined && pricingConfig.bulkPackages[packageIndex]) {
                const pkg = pricingConfig.bulkPackages[packageIndex];
                amount = pkg.price;
                description = `Bulk Package - ${pkg.adCount} ads`;
                paymentType = 'ad_credits';
            } else {
                throw new BadRequestError('Invalid bulk package');
            }
            break;

        case 'subscription':
            const planIndex = req.body.planIndex;
            if (planIndex !== undefined && pricingConfig.subscriptionPlans[planIndex]) {
                const plan = pricingConfig.subscriptionPlans[planIndex];
                amount = plan.price;
                description = `${plan.name} Subscription - 1 month`;
                paymentType = 'subscription';
            } else {
                throw new BadRequestError('Invalid subscription plan');
            }
            break;

        default:
            throw new BadRequestError('Invalid payment type');
    }

    // Add tax
    const taxAmount = (amount * pricingConfig.taxPercentage) / 100;
    const totalAmount = amount + taxAmount + pricingConfig.platformFee;

    // Convert to paise (Razorpay uses smallest currency unit)
    const amountInPaise = Math.round(totalAmount * 100);

    // Create Razorpay order
    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        notes: {
            userId: userId.toString(),
            type,
            priorityLevel: priorityLevel || '',
            duration: duration?.toString() || '',
        },
    });

    // Create payment record in database
    const payment = await Payment.create({
        userId,
        listingId: listingId || undefined,
        amount: amountInPaise,
        currency: 'INR',
        gateway: 'razorpay',
        gatewayTransactionId: order.id,
        gatewayOrderId: order.id,
        type: paymentType,
        description,
        status: 'pending',
        priorityLevel: priorityLevel || undefined,
        priorityDuration: duration || undefined,
        creditsPurchased: creditsPurchased || undefined,
        metadata: {
            baseAmount: amount,
            taxAmount,
            platformFee: pricingConfig.platformFee,
            taxPercentage: pricingConfig.taxPercentage,
        },
    });

    sendSuccess(res, 201, {
        orderId: order.id,
        amount: amountInPaise,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        paymentId: payment._id,
        description,
    }, 'Order created successfully');
});

// @desc    Verify Razorpay payment signature
// @route   POST /api/payments/verify
// @access  Private
export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        paymentId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new BadRequestError('Missing payment verification data');
    }

    // Verify signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
        throw new Error('Razorpay secret not configured');
    }

    const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

    if (generatedSignature !== razorpay_signature) {
        throw new BadRequestError('Invalid payment signature');
    }

    // Find and update payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
        throw new NotFoundError('Payment record not found');
    }

    payment.status = 'success';
    payment.gatewayPaymentId = razorpay_payment_id;
    payment.paidAt = new Date();
    await payment.save();

    // Update user based on payment type
    const user = await User.findById(payment.userId);
    if (!user) {
        throw new NotFoundError('User not found');
    }

    switch (payment.type) {
        case 'additional_ad':
            // Increment free ads quota by 1
            user.freeAdsQuota += 1;
            break;

        case 'ad_credits':
            // Add credits to user account
            if (payment.creditsPurchased) {
                user.adCredits += payment.creditsPurchased;
                user.creditsPurchased += payment.creditsPurchased;
            }
            break;

        case 'subscription':
            // Update subscription (simplified - would need proper subscription logic)
            user.subscriptionPlan = {
                name: 'Premium',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                isActive: true,
            } as any;
            break;

        case 'listing_priority':
            // Priority will be applied to listing when it's created/updated
            // Store payment ID in metadata for reference
            break;
    }

    await user.save();

    sendSuccess(res, 200, {
        payment,
        message: 'Payment verified successfully',
    });
});

// @desc    Get user's payment history
// @route   GET /api/payments/history
// @access  Private
export const getPaymentHistory = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { page = 1, limit = 20, status } = req.query;

    const query: any = { userId };
    if (status) {
        query.status = status;
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const payments = await Payment.find(query)
        .populate('listingId', 'title images')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum);

    const total = await Payment.countDocuments(query);

    sendSuccess(res, 200, {
        payments,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
        },
    });
});

// @desc    Get all payments (Admin)
// @route   GET /api/payments/admin/all
// @access  Private/Admin
export const getAllPayments = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, status, type, gateway } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (gateway) query.gateway = gateway;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const payments = await Payment.find(query)
        .populate('userId', 'name email')
        .populate('listingId', 'title')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum);

    const total = await Payment.countDocuments(query);

    // Get statistics
    const stats = await Payment.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
            },
        },
    ]);

    sendSuccess(res, 200, {
        payments,
        stats,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
        },
    });
});

// @desc    Refund payment (Admin)
// @route   POST /api/payments/:id/refund
// @access  Private/Admin
export const refundPayment = asyncHandler(async (req: Request, res: Response) => {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
        throw new NotFoundError('Payment not found');
    }

    if (payment.status !== 'success') {
        throw new BadRequestError('Can only refund successful payments');
    }

    // Process refund with Razorpay
    const razorpay = getRazorpayInstance();
    const refund = await razorpay.payments.refund(payment.gatewayPaymentId, {
        amount: payment.amount,
    });

    // Update payment status
    payment.status = 'refunded';
    payment.refundedAt = new Date();
    payment.metadata = {
        ...payment.metadata,
        refundId: refund.id,
    };
    await payment.save();

    // Reverse user benefits
    const user = await User.findById(payment.userId);
    if (user) {
        switch (payment.type) {
            case 'additional_ad':
                user.freeAdsQuota = Math.max(0, user.freeAdsQuota - 1);
                break;

            case 'ad_credits':
                if (payment.creditsPurchased) {
                    user.adCredits = Math.max(0, user.adCredits - payment.creditsPurchased);
                    user.creditsPurchased = Math.max(0, user.creditsPurchased - payment.creditsPurchased);
                }
                break;

            case 'subscription':
                if (user.subscriptionPlan) {
                    (user.subscriptionPlan as any).isActive = false;
                }
                break;
        }
        await user.save();
    }

    sendSuccess(res, 200, { payment, refund }, 'Payment refunded successfully');
});
