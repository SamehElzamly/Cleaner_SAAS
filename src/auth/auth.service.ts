import { Injectable } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.entity.js';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/user-auth.dto.js';
import type { StringValue } from 'ms';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {

  constructor(
    @InjectModel(User.name) private readonly usermodel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) { }

  async login(email: string, password: string): Promise<Tokens & { user: UserDocument }> {

    if (!email || !/^[^\s@]+@gmail\.com$/i.test(email)) {
      throw new BadRequestException('Invalid Gmail address');
    }

    if (!password || password.length < 6) {
      throw new BadRequestException('Invalid Password');
    }

    const user = await this.usermodel.findOne({ email }).select('+password');
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isEqual = await bcrypt.compare(password, user.password);

    if (!isEqual) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.getTokens(user._id.toString(), user.email);
    await this.updateRefreshTokenHash(user._id.toString(), tokens.refreshToken);

    return { user, ...tokens };
  }

  async create(user: CreateUserDto) {
    const saltRounds = Number(process.env.SaltRound) || 10;
    user.password = await bcrypt.hash(user.password, saltRounds);
    const create = new this.usermodel(user);
    return create.save();
  }

  // Called by JwtAccessGuard-protected routes to confirm the token is valid
  // and the user still exists (e.g. hasn't been deleted/banned since login).
  async verifyUser(userId: string) {
    const user = await this.usermodel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return user;
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<Tokens> {
    const user = await this.usermodel.findById(userId).select('+refreshTokenHash');
    if (!user || !user.refreshTokenHash) {
      throw new ForbiddenException('Access denied');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!refreshTokenMatches) {
      throw new ForbiddenException('Access denied');
    }

    const tokens = await this.getTokens(user._id.toString(), user.email);
    await this.updateRefreshTokenHash(user._id.toString(), tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.usermodel.updateOne(
      { _id: userId },
      { $unset: { refreshTokenHash: 1 } },
    );
    return { message: 'Logged out successfully' };
  }

  private async getTokens(userId: string, email: string): Promise<Tokens> {
    const payload = { sub: userId, email };

    const accessExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN as StringValue) || '15m';
    const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN as StringValue) || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usermodel.updateOne(
      { _id: userId },
      { $set: { refreshTokenHash } },
    );
  }

}