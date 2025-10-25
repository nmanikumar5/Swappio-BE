import { Request, Response } from 'express';
import { z } from 'zod';
import User from '../models/User';
import { TokenService } from '../services/tokenService';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { sanitizeString } from '../utils/sanitize';

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
    photo: z.string().url().optional(),
  }),
});

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

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    phone,
    location,
  });

  // Generate token
  const token = TokenService.generateToken(user._id.toString());

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

  // Find user with password
  const user = await User.findOne({ email: sanitizeString(email) }).select('+password');
  
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

  // Generate token
  const token = TokenService.generateToken(user._id.toString());

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
  // This endpoint is for consistency and can be used for token blacklisting in future
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
  if (photo !== undefined) user.photo = photo;

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
