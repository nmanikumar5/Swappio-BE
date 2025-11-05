// Clean User model: persist only encPassword (reversible) and provide comparePassword
import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { encryptText, decryptText } from '../utils/crypto';
import { config } from '../config/env';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash?: string; // argon2 one-way hash
  encPassword?: string; // reversible encrypted password (base64) - for migration only
  phone?: string;
  phoneVerified?: boolean;
  phoneVerificationCode?: string;
  phoneVerificationExpiry?: Date;
  photo?: string;
  location?: string;
  role: 'user' | 'admin';
  isActive: boolean;
  isSuspended: boolean;
  averageRating?: number;
  totalRatings?: number;
  ratingBreakdown?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };

  // Ad Quota Management
  freeAdsUsedThisMonth: number;
  freeAdsQuota: number;
  lastQuotaReset?: Date;

  // Credits System
  adCredits: number;
  creditsPurchased: number;
  creditsUsed: number;

  // Payment Info
  stripeCustomerId?: string;
  razorpayCustomerId?: string;

  // Subscription (if any)
  subscriptionPlan?: 'basic' | 'pro' | 'business';
  subscriptionStatus?: 'active' | 'cancelled' | 'expired';
  subscriptionExpiresAt?: Date;

  // Stats
  totalSpent: number;
  premiumAdsPosted: number;

  createdAt: Date;
  updatedAt: Date;
  refreshTokens?: {
    tokenHash: string;
    createdAt: Date;
    expiresAt?: Date;
  }[];
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    passwordHash: {
      type: String,
      select: false,
    },
    refreshTokens: [
      {
        tokenHash: { type: String },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date },
      },
    ],
    encPassword: {
      type: String,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerificationCode: {
      type: String,
      select: false,
    },
    phoneVerificationExpiry: {
      type: Date,
      select: false,
    },
    photo: {
      type: String,
    },
    location: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: 0,
    },
    ratingBreakdown: {
      type: {
        5: { type: Number, default: 0 },
        4: { type: Number, default: 0 },
        3: { type: Number, default: 0 },
        2: { type: Number, default: 0 },
        1: { type: Number, default: 0 },
      },
      default: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    },

    // Ad Quota Management
    freeAdsUsedThisMonth: {
      type: Number,
      default: 0,
      min: 0,
    },
    freeAdsQuota: {
      type: Number,
      default: 3, // Default fallback - will be overridden by config
      min: 0,
    },
    lastQuotaReset: {
      type: Date,
    },

    // Credits System
    adCredits: {
      type: Number,
      default: 0,
      min: 0,
    },
    creditsPurchased: {
      type: Number,
      default: 0,
      min: 0,
    },
    creditsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Payment Info
    stripeCustomerId: {
      type: String,
      sparse: true,
    },
    razorpayCustomerId: {
      type: String,
      sparse: true,
    },

    // Subscription (if any)
    subscriptionPlan: {
      type: String,
      enum: ['basic', 'pro', 'business'],
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
    },
    subscriptionExpiresAt: {
      type: Date,
    },

    // Stats
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    premiumAdsPosted: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (this: any, next) {
  try {
    // Accept password whether it's provided as a declared schema path or as a transient property
    const fromGet = typeof this.get === 'function' ? this.get('password') : undefined;
    const fromProp = (this as any).password;
    const plain = fromProp ?? fromGet;

    if (plain) {
      try {
        // Try using argon2 if available (dynamic import). If argon2 is not
        // present or fails to load (native binding missing), fall back to
        // bcryptjs for local/dev environments so the server can start.
        try {
          const aMod = await import('argon2');
          const a = (aMod && (aMod as any).default) ? (aMod as any).default : aMod;
          (this as any).passwordHash = await a.hash(String(plain));
        } catch (innerErr) {
          // fallback to bcrypt
          (this as any).passwordHash = await bcrypt.hash(String(plain), 10);
        }
      } catch (err) {
        return next(err as any);
      }
      // Remove transient plaintext password after hashing
      try {
        if (typeof this.set === 'function') this.set('password', undefined);
        else (this as any).password = undefined;
      } catch { }
    }
  } catch (e) {
    /* ignore */
  }
  next();
});

userSchema.methods.comparePassword = async function (this: any, candidatePassword: string): Promise<boolean> {
  if (this.passwordHash) {
    try {
      // try argon2 verify if available
      try {
        const aMod = await import('argon2');
        const a = (aMod && (aMod as any).default) ? (aMod as any).default : aMod;
        return await a.verify(this.passwordHash, candidatePassword);
      } catch (inner) {
        // fall back to bcrypt (if passwordHash was created using bcrypt fallback)
        try {
          return await bcrypt.compare(candidatePassword, this.passwordHash);
        } catch {
          return false;
        }
      }
    } catch {
      return false;
    }
  }

  // Legacy bcrypt stored in `password` field (e.g. $2b$...)
  if (this.password && typeof this.password === 'string' && /^\$2[aby]\$/.test(this.password)) {
    try {
      return await bcrypt.compare(candidatePassword, this.password);
    } catch {
      return false;
    }
  }

  if (this.encPassword) {
    try {
      const decrypted = decryptText(this.encPassword);
      return decrypted === candidatePassword;
    } catch {
      return false;
    }
  }

  return false;
};

export default mongoose.model<IUser>('User', userSchema);
