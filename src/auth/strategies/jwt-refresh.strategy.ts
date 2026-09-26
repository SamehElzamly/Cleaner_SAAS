import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from '../jwt-payload.interface.js';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const authHeader = req.get('Authorization') ?? '';
    const refreshToken = authHeader.replace('Bearer', '').trim();

    // We pass the raw token along so the service can compare it
    // against the hashed refresh token stored in the DB.
    return { userId: payload.sub, email: payload.email, refreshToken };
  }
}
