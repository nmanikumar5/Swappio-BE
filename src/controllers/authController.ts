import { Request, Response } from 'express';
import { z } from 'zod';
import User from '../models/User';
import { TokenService } from '../services/tokenService';
import { TwilioService } from '../services/twilioService';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { sanitizeString } from '../utils/sanitize';
import { encryptText, decryptText } from '../utils/crypto';
import { config } from '../config/env';
import { configService } from '../services/configService';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';

// helper to hash using argon2 when available, otherwise fallback to bcrypt
async function hashPassword(pw: string) {
  try {
    const aMod = await import('argon2');
    const a = (aMod && (aMod as any).default) ? (aMod as any).default : aMod;
    return await a.hash(pw);
  } catch (e) {
    return await bcrypt.hash(pw, 10);
  }
}

// Validation schemas
export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().optional(),
    location: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    photo: z.union([z.string().url(), z.literal('')]).optional(),
  }),
});

export const googleAuthSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Google token is required'),
  }),
});

export const sendPhoneCodeSchema = z.object({
  body: z.object({
    phone: z.string().min(10, 'Phone number is required'),
  }),
});

export const verifyPhoneCodeSchema = z.object({
  body: z.object({
    phone: z.string().min(10, 'Phone number is required'),
    code: z.string().length(6, 'Verification code must be 6 digits'),
    name: z.string().min(2, 'Name is required').optional(),
  }),
});

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, phone, location } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: sanitizeString(email) });
  if (existingUser) {
    throw new ValidationError('User with this email already exists');
  }

  // Get free ads quota from config
  const freeAdsQuota = await configService.getNumber('FREE_ADS_PER_MONTH', 3);

  // Create user
  // Hash password server-side to ensure passwordHash is persisted regardless of mongoose hooks
  const passwordHash = await hashPassword(password);
  const sanitizedEmail = sanitizeString(email);
  const doc: any = {
    name,
    email: sanitizedEmail,
    passwordHash,
    phone,
    location,
    freeAdsQuota, // Set from config
  };

  // If an encryption key is configured, also store encPassword for migration compatibility
  try {
    if (config.encryptionKey) {
      doc.encPassword = encryptText(password);
    }
  } catch (e) {
    // ignore encryption errors
  }

  const user = await User.create(doc);

  // Generate token
  const token = TokenService.generateToken(user._id.toString());

  // Create and persist refresh token (opaque) so new user can use cookie-based flows
  try {
    const refresh = TokenService.generateRefreshToken();
    const refreshHash = TokenService.hashRefreshToken(refresh);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
    (user as any).refreshTokens = (user as any).refreshTokens || [];
    (user as any).refreshTokens.push({ tokenHash: refreshHash, createdAt: new Date(), expiresAt });
    const maxTokens = parseInt(process.env.MAX_REFRESH_TOKENS_PER_USER || '5');
    if ((user as any).refreshTokens.length > maxTokens) {
      (user as any).refreshTokens = (user as any).refreshTokens.slice(-maxTokens);
    }
    await user.save();

    // set cookies for client
    try {
      res.cookie('swappio_refresh', refresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });
    } catch { }
  } catch (e) {
    // ignore refresh persistence errors
  }

  // Also set access token cookie to match login behavior
  try {
    res.cookie('swappio_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
  } catch (e) {
    // ignore cookie set errors
  }

  sendSuccess(res, 201, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      photo: user.photo,
      location: user.location,
      role: user.role,
    },
    token,
  }, 'User registered successfully');
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Find user and include passwordHash/encPassword for verification/migration
  const user = await User.findOne({ email: sanitizeString(email) }).select('+passwordHash +encPassword');

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check if account is active
  if (!user.isActive) {
    throw new UnauthorizedError('Account is deactivated');
  }

  if (user.isSuspended) {
    throw new UnauthorizedError('Account is suspended');
  }

  // Check password
  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Migration: if user still has encPassword, migrate to passwordHash (one-way) and remove encPassword
  try {
    if ((user as any).encPassword && !(user as any).passwordHash) {
      // since we've already verified password via comparePassword, we can hash the provided password
      (user as any).passwordHash = await hashPassword(password);
      (user as any).encPassword = undefined;
      await user.save();
    }
    // Migration: if user has legacy bcrypt `password` field and no passwordHash, migrate it
    if ((user as any).password && !(user as any).passwordHash) {
      try {
        // Only migrate when the provided password matched (we're in successful login path)
        (user as any).passwordHash = await hashPassword(password);
        (user as any).password = undefined;
        await user.save();
      } catch (e) {
        // ignore migration errors
      }
    }
  } catch (e) {
    // ignore migration errors for now
  }

  // Generate token
  const token = TokenService.generateToken(user._id.toString());

  // Set httpOnly cookie for server-side auth checks (middleware)
  try {
    res.cookie('swappio_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
  } catch (e) {
    // if cookie can't be set, continue and return token in body
  }

  // Create refresh token (opaque) and persist its hash server-side for rotation
  try {
    const refresh = TokenService.generateRefreshToken();
    const refreshHash = TokenService.hashRefreshToken(refresh);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
    // push to user's refreshTokens and save
    (user as any).refreshTokens = (user as any).refreshTokens || [];
    (user as any).refreshTokens.push({ tokenHash: refreshHash, createdAt: new Date(), expiresAt });
    // Trim to most recent N tokens
    const maxTokens = parseInt(process.env.MAX_REFRESH_TOKENS_PER_USER || '5');
    if ((user as any).refreshTokens.length > maxTokens) {
      (user as any).refreshTokens = (user as any).refreshTokens.slice(-maxTokens);
    }
    await user.save();
    // debug: log refresh tokens for troubleshooting
    try {
      console.debug(`login: user=${user._id} refreshTokens=${JSON.stringify((user as any).refreshTokens?.map((r: any) => ({ tokenHash: r.tokenHash, createdAt: r.createdAt })))}`);
    } catch { }
    // set httpOnly refresh cookie
    res.cookie('swappio_refresh', refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });
  } catch { }

  sendSuccess(res, 200, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      photo: user.photo,
      location: user.location,
      role: user.role,
    },
    token,
  }, 'Login successful');
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req: Request, res: Response) => {
  // In JWT-based auth, logout is handled on client side by removing token
  // Remove refresh token entry server-side and clear cookies
  try {
    const refresh = req.cookies?.swappio_refresh || undefined;
    if (refresh && req.user) {
      const refreshHash = TokenService.hashRefreshToken(refresh);
      (req.user as any).refreshTokens = (req.user as any).refreshTokens?.filter((r: any) => r.tokenHash !== refreshHash) || [];
      await (req.user as any).save();
    }

    // Clear cookies with all necessary options to ensure they're actually removed
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    };

    res.clearCookie('swappio_token', cookieOptions);
    res.clearCookie('swappio_refresh', cookieOptions);
  } catch { }
  sendSuccess(res, 200, null, 'Logout successful');
});

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  sendSuccess(res, 200, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      photo: user.photo,
      location: user.location,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const { name, phone, location, photo } = req.body;

  // Update fields
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (location !== undefined) user.location = location;
  // Only update photo if it's a valid URL, not an empty string
  if (photo !== undefined && photo !== '') user.photo = photo;

  await user.save();

  sendSuccess(res, 200, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      photo: user.photo,
      location: user.location,
      role: user.role,
    },
  }, 'Profile updated successfully');
});

// @desc    Delete user account
// @route   DELETE /api/auth/profile
// @access  Private
export const deleteProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  // Soft delete - deactivate account
  user.isActive = false;
  await user.save();

  sendSuccess(res, 200, null, 'Account deleted successfully');
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public (relies on refresh cookie)
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  // read refresh cookie
  const refresh = req.cookies?.swappio_refresh || req.headers.cookie?.split(';').map((c: string) => c.trim()).find((c: string) => c.startsWith('swappio_refresh='))?.split('=')[1];
  if (!refresh) throw new UnauthorizedError('No refresh token');

  const refreshHash = TokenService.hashRefreshToken(refresh);
  console.debug(`refresh: received refresh (trim)='${String(refresh).slice(0, 12)}' refreshHash='${refreshHash.slice(0, 12)}'`);

  // find user with this refreshHash
  const user = await User.findOne({ 'refreshTokens.tokenHash': refreshHash }).select('+passwordHash +encPassword');
  if (!user) {
    // Possible token reuse or invalid token. Log and return 401.
    console.warn('Refresh token not found in DB - possible reuse or invalid token');
    throw new UnauthorizedError('Invalid refresh token');
  }

  // find the token entry and check expiry
  const entry: any = (user as any).refreshTokens.find((r: any) => r.tokenHash === refreshHash);
  if (!entry) throw new UnauthorizedError('Invalid refresh token');
  if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
    throw new UnauthorizedError('Refresh token expired');
  }

  // rotate: remove the old token entry and add a new one
  try {
    // remove old
    (user as any).refreshTokens = (user as any).refreshTokens.filter((r: any) => r.tokenHash !== refreshHash);
    // create new refresh
    const newRefresh = TokenService.generateRefreshToken();
    const newHash = TokenService.hashRefreshToken(newRefresh);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    (user as any).refreshTokens.push({ tokenHash: newHash, createdAt: new Date(), expiresAt });
    // Trim tokens to configured max
    const maxTokens = parseInt(process.env.MAX_REFRESH_TOKENS_PER_USER || '5');
    if ((user as any).refreshTokens.length > maxTokens) {
      (user as any).refreshTokens = (user as any).refreshTokens.slice(-maxTokens);
    }
    await user.save();
    // set new cookie
    res.cookie('swappio_refresh', newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
  } catch (e) {
    // ignore rotation errors
  }

  // issue new access token
  const token = TokenService.generateToken(user._id.toString());
  try {
    res.cookie('swappio_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
  } catch { }

  sendSuccess(res, 200, { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } }, 'Token refreshed');
});

// @desc    Google OAuth login
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    throw new ValidationError('Google token is required');
  }

  try {
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      throw new UnauthorizedError('Invalid Google token');
    }

    const { email, name, picture, sub: googleId } = payload;

    // Check if user exists
    let user = await User.findOne({ email: sanitizeString(email) });

    if (!user) {
      // Get free ads quota from config
      const freeAdsQuota = await configService.getNumber('FREE_ADS_PER_MONTH', 3);

      // Create new user with Google account
      user = await User.create({
        name: name || 'Google User',
        email: sanitizeString(email),
        photo: picture,
        freeAdsQuota, // Set from config
        // No password needed for Google OAuth users
        role: 'user',
      });
    } else {
      // Update photo if from Google and user doesn't have one
      if (picture && !user.photo) {
        user.photo = picture;
        await user.save();
      }
    }

    // Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    if (user.isSuspended) {
      throw new UnauthorizedError('Account is suspended');
    }

    // Generate tokens
    const accessToken = TokenService.generateToken(user._id.toString());

    // Create refresh token
    try {
      const refresh = TokenService.generateRefreshToken();
      const refreshHash = TokenService.hashRefreshToken(refresh);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

      (user as any).refreshTokens = (user as any).refreshTokens || [];
      (user as any).refreshTokens.push({ tokenHash: refreshHash, createdAt: new Date(), expiresAt });

      const maxTokens = parseInt(process.env.MAX_REFRESH_TOKENS_PER_USER || '5');
      if ((user as any).refreshTokens.length > maxTokens) {
        (user as any).refreshTokens = (user as any).refreshTokens.slice(-maxTokens);
      }
      await user.save();

      // Set refresh cookie
      res.cookie('swappio_refresh', refresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });
    } catch (e) {
      // ignore refresh token errors
    }

    // Set access token cookie
    try {
      res.cookie('swappio_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });
    } catch (e) {
      // ignore cookie errors
    }

    sendSuccess(res, 200, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        photo: user.photo,
        location: user.location,
        role: user.role,
      },
      token: accessToken,
    }, 'Google authentication successful');

  } catch (error: any) {
    if (error.message?.includes('Token used too late')) {
      throw new UnauthorizedError('Google token expired');
    }
    throw new UnauthorizedError('Invalid Google token');
  }
});

// @desc    Send phone verification code
// @route   POST /api/auth/phone/send-code
// @access  Public
export const sendPhoneCode = asyncHandler(async (req: Request, res: Response) => {
  let { phone } = req.body;

  // Format phone number to E.164
  phone = TwilioService.formatPhoneNumber(phone);

  // Validate phone number format
  if (!TwilioService.validatePhoneNumber(phone)) {
    throw new ValidationError('Invalid phone number format. Use format: +919876543210');
  }

  // Generate 6-digit code
  const code = TwilioService.generateVerificationCode();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Find or create user with phone number
  let user = await User.findOne({ phone }).select('+phoneVerificationCode +phoneVerificationExpiry');

  if (!user) {
    // Get free ads quota from config
    const freeAdsQuota = await configService.getNumber('FREE_ADS_PER_MONTH', 3);

    // Create temporary user record for verification
    user = await User.create({
      phone,
      phoneVerificationCode: code,
      phoneVerificationExpiry: expiry,
      name: 'Phone User', // Temporary name, will be updated on verification
      email: `${phone.replace('+', '')}@temp.swappio.com`, // Temporary email
      phoneVerified: false,
      freeAdsQuota, // Set from config
    });
  } else {
    // Update existing user's verification code
    (user as any).phoneVerificationCode = code;
    (user as any).phoneVerificationExpiry = expiry;
    await user.save();
  }

  // Send SMS
  try {
    await TwilioService.sendVerificationCode(phone, code);
  } catch (error) {
    console.error('SMS sending error:', error);
    // In development, continue even if SMS fails
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Failed to send verification code');
    }
  }

  sendSuccess(res, 200, {
    phone,
    expiresIn: 600, // 10 minutes in seconds
  }, 'Verification code sent successfully');
});

// @desc    Verify phone code and login
// @route   POST /api/auth/phone/verify-code
// @access  Public
export const verifyPhoneCode = asyncHandler(async (req: Request, res: Response) => {
  let { phone, code, name } = req.body;

  // Format phone number
  phone = TwilioService.formatPhoneNumber(phone);

  // Find user with phone number
  const user = await User.findOne({ phone }).select('+phoneVerificationCode +phoneVerificationExpiry');

  if (!user) {
    throw new NotFoundError('No verification request found for this phone number');
  }

  // Check if code matches
  if ((user as any).phoneVerificationCode !== code) {
    throw new UnauthorizedError('Invalid verification code');
  }

  // Check if code expired
  if (new Date() > (user as any).phoneVerificationExpiry) {
    throw new UnauthorizedError('Verification code has expired');
  }

  // Mark phone as verified
  user.phoneVerified = true;
  (user as any).phoneVerificationCode = undefined;
  (user as any).phoneVerificationExpiry = undefined;

  // Update name if provided (for new users)
  if (name && user.name === 'Phone User') {
    user.name = name;
  }

  await user.save();

  // Generate tokens
  const token = TokenService.generateToken(user._id.toString());

  // Create refresh token
  try {
    const refresh = TokenService.generateRefreshToken();
    const refreshHash = TokenService.hashRefreshToken(refresh);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

    (user as any).refreshTokens = (user as any).refreshTokens || [];
    (user as any).refreshTokens.push({ tokenHash: refreshHash, createdAt: new Date(), expiresAt });

    const maxTokens = parseInt(process.env.MAX_REFRESH_TOKENS_PER_USER || '5');
    if ((user as any).refreshTokens.length > maxTokens) {
      (user as any).refreshTokens = (user as any).refreshTokens.slice(-maxTokens);
    }
    await user.save();

    // Set refresh cookie
    res.cookie('swappio_refresh', refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
  } catch (e) {
    // ignore refresh token errors
  }

  // Set access token cookie
  try {
    res.cookie('swappio_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
  } catch (e) {
    // ignore cookie errors
  }

  sendSuccess(res, 200, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      photo: user.photo,
      location: user.location,
      role: user.role,
    },
    token,
  }, 'Phone verification successful');
});

/**
 * Check user's ad quota and credit balance
 */
export const checkQuota = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Reset quota if needed (monthly reset)
  const now = new Date();
  const lastReset = user.lastQuotaReset ? new Date(user.lastQuotaReset) : null;
  const needsReset = !lastReset ||
    (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear());

  if (needsReset) {
    user.freeAdsUsedThisMonth = 0;
    user.lastQuotaReset = now;
    await user.save();
  }

  const freeAdsRemaining = Math.max(0, user.freeAdsQuota - user.freeAdsUsedThisMonth);
  const canPostFree = freeAdsRemaining > 0;

  sendSuccess(res, 200, {
    quota: {
      freeAdsQuota: user.freeAdsQuota,
      freeAdsUsed: user.freeAdsUsedThisMonth,
      freeAdsRemaining,
      canPostFree,
      lastQuotaReset: user.lastQuotaReset,
    },
    credits: {
      available: user.adCredits,
      purchased: user.creditsPurchased,
      used: user.creditsUsed,
    },
    subscription: user.subscriptionPlan ? {
      plan: user.subscriptionPlan,
      status: user.subscriptionStatus,
      expiresAt: user.subscriptionExpiresAt,
    } : null,
  }, 'Quota retrieved successfully');
});

