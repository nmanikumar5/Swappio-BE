import jwt from 'jsonwebtoken';
import { config } from '../config/env';

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
}
