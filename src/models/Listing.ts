import mongoose, { Document, Schema } from 'mongoose';

export interface IListing extends Document {
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  images: string[];
  ownerId: mongoose.Types.ObjectId;
  status: 'active' | 'sold' | 'deleted';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  condition?: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  rejectionReason?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  views: number;
  isApproved: boolean; // Deprecated - kept for backwards compatibility

  // Priority & Payment
  priority: 'standard' | 'featured' | 'premium' | 'platinum';
  priorityExpiresAt?: Date;
  priorityStartedAt?: Date;

  // Payment tracking
  paidAmount: number;
  paymentId?: mongoose.Types.ObjectId;
  paymentStatus: 'free' | 'paid' | 'refunded';

  // Visibility tracking
  viewCount: number;
  featuredViewCount: number;
  impressions: number;

  // Ad performance
  favoriteCount: number;
  messageCount: number;
  clickThroughRate: number;

  // Flags
  isPaid: boolean;
  isPromoted: boolean;
  autoRenew: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const listingSchema = new Schema<IListing>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [1, 'Description must be at least 1 character'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be a positive number'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'sold', 'deleted'],
      default: 'active',
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    condition: {
      type: String,
      enum: ['new', 'like-new', 'good', 'fair', 'poor'],
      trim: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    views: {
      type: Number,
      default: 0,
    },
    isApproved: {
      type: Boolean,
      default: false, // Changed to false - require approval
    },

    // Priority & Payment
    priority: {
      type: String,
      enum: ['standard', 'featured', 'premium', 'platinum'],
      default: 'standard',
      index: true,
    },
    priorityExpiresAt: {
      type: Date,
      index: true,
    },
    priorityStartedAt: {
      type: Date,
    },

    // Payment tracking
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    paymentStatus: {
      type: String,
      enum: ['free', 'paid', 'refunded'],
      default: 'free',
      index: true,
    },

    // Visibility tracking
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    featuredViewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    impressions: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Ad performance
    favoriteCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    messageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    clickThroughRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Flags
    isPaid: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPromoted: {
      type: Boolean,
      default: false,
      index: true,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
listingSchema.index({ ownerId: 1 });
listingSchema.index({ category: 1 });
listingSchema.index({ location: 1 });
listingSchema.index({ price: 1 });
listingSchema.index({ status: 1 });
listingSchema.index({ approvalStatus: 1 });
listingSchema.index({ condition: 1 });
listingSchema.index({ views: -1 }); // For sorting by popularity
listingSchema.index({ title: 'text', description: 'text' });
listingSchema.index({ createdAt: -1 });

export default mongoose.model<IListing>('Listing', listingSchema);
