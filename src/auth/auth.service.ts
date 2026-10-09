import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, UserRole } from './entities/user.entity.js';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { CreateUserDto } from './dto/user-auth.dto.js';
import { JwtPayload } from './jwt-payload.interface.js';
import { TenantService } from '../tenant/tenant.service.js';
import { TenantStatus } from '../tenant/enums/tenant-status.enum.js';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

// What we actually return to clients — never the password hash or the
// refresh-token hash. Both are `select: false` on the schema, but that only
// protects *future* queries; a document this service already explicitly
// `.select('+password')`'d (to check the login password) still carries it
// in memory, and the original code returned that document as-is.
//
// Built from `ReturnType<UserDocument['toObject']>`, NOT from UserDocument
// itself: sanitizeUser() calls `.toObject()` before stripping fields, which
// returns a plain object (just the schema's data) — it does not carry any
// of the Mongoose document methods (save, $clone, $assertPopulated, ...).
// Omit<UserDocument, ...> kept those methods in the type while the actual
// value never had them, which is what TS was correctly flagging.
type PlainUser = ReturnType<UserDocument['toObject']>;
export type PublicUser = Omit<PlainUser, 'password' | 'refreshTokenHash'>;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly tenantService: TenantService,
  ) {}

  async login(email: string, password: string): Promise<Tokens & { user: PublicUser }> {
    // Previously: a hardcoded `/^[^\s@]+@gmail\.com$/i` check here rejected
    // every non-Gmail address before even hitting the database — meaning no
    // user could ever log in unless their email happened to be @gmail.com.
    // Email format is now validated once, on LoginDto, via @IsEmail.

    const user = await this.userModel.findOne({ email }).select('+password');
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException('This account has been deactivated');
    }

    await this.assertTenantIsUsable(user);

    const tokens = await this.getTokens(user);
    await this.updateRefreshTokenHash(user._id.toString(), tokens.refreshToken);

    return { user: this.sanitizeUser(user), ...tokens };
  }

  // Public self-registration. `role` is ALWAYS forced to USER here — never
  // trust a role coming from the request body (see the comment in
  // CreateUserDto for why that used to be a privilege-escalation hole).
  async create(dto: CreateUserDto): Promise<PublicUser> {
    // Minimum safety net until Phase 1 replaces raw tenantId input with
    // invite-token or subdomain-based tenant resolution: at least confirm
    // the tenant being joined actually exists and is active.
    const tenant = await this.tenantService.findOne(dto.tenantId).catch(() => null);
    if (!tenant) {
      throw new BadRequestException('Invalid tenantId');
    }
    if (tenant.status !== TenantStatus.ACTIVE) {
      throw new BadRequestException('This tenant is not active');
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    try {
      const created = new this.userModel({
        ...dto,
        password: passwordHash,
        role: UserRole.USER,
      });
      const saved = await created.save();
      return this.sanitizeUser(saved);
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException('A user with this email already exists for this tenant');
      }
      throw err;
    }
  }

  // Called by JwtAccessGuard-protected routes to confirm the token is valid
  // and the user still exists (e.g. hasn't been deleted/banned since login).
  async verifyUser(userId: string): Promise<PublicUser> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    if (!user.isActive) {
      throw new ForbiddenException('This account has been deactivated');
    }
    return this.sanitizeUser(user);
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<Tokens> {
    const user = await this.userModel.findById(userId).select('+refreshTokenHash');
    if (!user || !user.refreshTokenHash) {
      throw new ForbiddenException('Access denied');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!refreshTokenMatches) {
      throw new ForbiddenException('Access denied');
    }

    // Previously missing: a deactivated user (or one whose tenant was
    // suspended after they logged in) could keep refreshing tokens forever,
    // since only login checked anything — refresh just trusted the old hash.
    if (!user.isActive) {
      throw new ForbiddenException('This account has been deactivated');
    }
    await this.assertTenantIsUsable(user);

    const tokens = await this.getTokens(user);
    await this.updateRefreshTokenHash(user._id.toString(), tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.userModel.updateOne(
      { _id: userId },
      { $unset: { refreshTokenHash: 1 } },
    );
    return { message: 'Logged out successfully' };
  }

  // Shared by login and refresh: a platform admin has no tenant, so only
  // check tenant status when the user actually belongs to one.
  private async assertTenantIsUsable(user: UserDocument) {
    if (!user.tenantId) return;
    const tenant = await this.tenantService.findOne(user.tenantId.toString()).catch(() => null);
    if (!tenant || tenant.status !== TenantStatus.ACTIVE) {
      throw new ForbiddenException("This tenant's account is not active");
    }
  }

  private async getTokens(user: UserDocument): Promise<Tokens> {
    // tenantId / role are embedded so the Tenant Resolver and any RBAC
    // guard can scope a request without an extra DB round-trip (previously
    // the payload only had `sub` and `email`). This makes them "sticky" for
    // the life of the access token (short-lived, ~15m) — if a user's role
    // or tenant changes, it won't take effect until their next refresh.
    // Acceptable given the short access-token lifetime.
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      tenantId: user.tenantId ? user.tenantId.toString() : null,
      role: user.role,
    };

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
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { refreshTokenHash } },
    );
  }

  private sanitizeUser(user: UserDocument): PublicUser {
    const obj = user.toObject();
    delete (obj as any).password;
    delete (obj as any).refreshTokenHash;
    return obj as PublicUser;
  }
}