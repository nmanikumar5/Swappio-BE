import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import crypto from 'crypto';

function randomBase64(size = 48) {
  return crypto.randomBytes(size).toString('base64url');
}

export class TokenService {
  static generateToken(userId: string): string {
    return jwt.sign(
      { id: userId },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
    );
  }

  static verifyToken(token: string): string | jwt.JwtPayload {
    return jwt.verify(token, config.jwtSecret);
  }

  // Refresh token: opaque random string stored in httpOnly cookie. We store only a hash server-side.
  static generateRefreshToken() {
    return randomBase64(48);
  }

  static hashRefreshToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
