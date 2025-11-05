import mongoose, { Document, Schema } from 'mongoose';

export interface IRating extends Document {
    reviewer: mongoose.Types.ObjectId; // User who left the rating
    reviewee: mongoose.Types.ObjectId; // User being rated
    listing?: mongoose.Types.ObjectId; // Optional: related listing
    rating: number; // 1-5 stars
    review?: string; // Optional text review
    type: 'buyer' | 'seller'; // Was the reviewee a buyer or seller in this transaction
    createdAt: Date;
    updatedAt: Date;
}

const RatingSchema = new Schema<IRating>(
    {
        reviewer: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        reviewee: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        listing: {
            type: Schema.Types.ObjectId,
            ref: 'Listing',
            index: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        review: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        type: {
            type: String,
            enum: ['buyer', 'seller'],
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to prevent duplicate ratings for the same transaction
RatingSchema.index({ reviewer: 1, reviewee: 1, listing: 1 }, { unique: true });

// Index for calculating average ratings
RatingSchema.index({ reviewee: 1, rating: 1 });

export default mongoose.model<IRating>('Rating', RatingSchema);
