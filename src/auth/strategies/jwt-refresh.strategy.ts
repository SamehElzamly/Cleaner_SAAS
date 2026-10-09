import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { JwtPayload } from '../jwt-payload.interface.js';

// Reused in both the strategy's own jwtFromRequest option and in validate()
// below, instead of hand-parsing the Authorization header a second time
// (the original code did `authHeader.replace('Bearer', '').trim()`, which
// breaks on a lowercase "bearer" or a header with irregular whitespace —
// cases passport-jwt's own extractor already handles correctly).
const extractToken = ExtractJwt.fromAuthHeaderAsBearerToken();

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: extractToken,
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshToken = extractToken(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // We pass the raw token along so the service can compare it against the
    // hashed refresh token stored in the DB.
    return {
      userId: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      role: payload.role,
      refreshToken,
    };
  }
}