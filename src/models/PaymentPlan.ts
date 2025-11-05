import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentPlan extends Document {
    name: string;
    type: 'subscription' | 'credits' | 'priority';
    description: string;
    price: number;
    currency: string;
    numberOfDays?: number; // days for subscription (renamed from duration)
    adsPerMonth?: number; // number of ads allowed per month for subscription
    credits?: number; // number of credits for credit packages
    features: string[];
    isActive: boolean;
    priorityLevel?: 'featured' | 'urgent' | 'standard';
    adBoost?: number; // percentage boost
    createdAt: Date;
    updatedAt: Date;
}

const paymentPlanSchema = new Schema<IPaymentPlan>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['subscription', 'credits', 'priority'],
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            default: 'INR',
            enum: ['INR', 'USD'],
        },
        numberOfDays: {
            type: Number, // in days (renamed from duration)
            min: 1,
        },
        adsPerMonth: {
            type: Number, // number of ads allowed per month for subscription plans
            min: 1,
        },
        credits: {
            type: Number,
            min: 1,
        },
        features: {
            type: [String],
            default: [],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        priorityLevel: {
            type: String,
            enum: ['featured', 'urgent', 'standard'],
            default: 'standard',
        },
        adBoost: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
        },
    },
    { timestamps: true }
);

// Index for efficient queries
paymentPlanSchema.index({ type: 1, isActive: 1 });

export default mongoose.model<IPaymentPlan>('PaymentPlan', paymentPlanSchema);
