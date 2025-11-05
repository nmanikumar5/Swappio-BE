import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import User, { IUser } from '../models/User';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

interface JwtPayload {
  id: string;
}

export const authenticate = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // Prefer Authorization header: Bearer <token>
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Friendly message for missing header
      // Allow cookie fallback only for server-side rendered requests which set `X-SSR: 1` header.
      const isSSR = req.headers['x-ssr'] === '1' || req.headers['x-ssr'] === 'true';
      if (isSSR) {
        // attempt to read cookie named swappio_token
        if ((req as any).cookies && (req as any).cookies.swappio_token) {
          token = (req as any).cookies.swappio_token;
        } else if (req.headers.cookie) {
          const cookieHeader = req.headers.cookie as string;
          const match = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith('swappio_token='));
          if (match) token = match.substring('swappio_token='.length);
        }
      } else {
        throw new UnauthorizedError('Missing Authorization header. Include Authorization: Bearer <token> in requests.');
      }
    }

    try {
      if (!token) {
        throw new UnauthorizedError('Missing token after parsing.');
      }
      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret) as unknown as JwtPayload;

      // Get user from token
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('User account is deactivated');
      }

      if (user.isSuspended) {
        throw new ForbiddenError('User account is suspended');
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired');
      }
      throw error;
    }
  }
);

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Not authorized to access this resource');
    }

    next();
  };
};
