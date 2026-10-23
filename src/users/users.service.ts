import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Gender, User, UserDocument, UserRole } from '../auth/entities/user.entity.js';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { CreateTenantAdminDto } from './dto/create-tenant-admin.dto.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';

type PlainUser = ReturnType<UserDocument['toObject']>;
export type PublicUser = Omit<PlainUser, 'password' | 'refreshTokenHash'>;

// Shared shape between CreateUserByAdminDto and CreateTenantAdminDto — both
// carry the same person-creation fields, they just differ in who's allowed
// to call them and which role gets assigned.
interface NewUserFields {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  gender?: Gender;
  dateOfBirth?: Date;
  address?: string;
  city?: string;
  jobTitle?: string;
  department?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  private sanitize(user: UserDocument): PublicUser {
    const obj = user.toObject();
    delete (obj as any).password;
    delete (obj as any).refreshTokenHash;
    return obj as PublicUser;
  }

  // Centralizes the hash-and-save logic so `create()` (role chosen by a
  // COMPANY admin, defaults to USER) and `createTenantAdmin()` (role always
  // forced to COMPANY, called by a platform ADMIN) can't drift apart —
  // previously each would have hand-rolled its own bcrypt/try-catch block.
  private async createUserRecord(
    tenantId: string,
    dto: NewUserFields,
    role: UserRole,
  ): Promise<PublicUser> {
    // Enforce the tenant's plan limit. A tenant with NO active subscription
    // is currently unlimited (so a platform admin can provision its first
    // admin before the tenant has subscribed) — tighten this later if you
    // want a mandatory plan/trial.
    const plan = await this.subscriptionsService.getActivePlan(tenantId);
    if (plan) {
      const currentUsers = await this.userModel.countDocuments({ tenantId }).exec();
      if (currentUsers >= plan.maxUsers) {
        throw new ForbiddenException(
          `Your "${plan.name}" plan allows up to ${plan.maxUsers} users — upgrade to add more`,
        );
      }
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    try {
      const created = new this.userModel({
        ...dto,
        password: passwordHash,
        role,
        tenantId,
      });
      const saved = await created.save();
      return this.sanitize(saved);
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException('A user with this email already exists for this tenant');
      }
      throw err;
    }
  }

  // Every method below takes `tenantId` as its first argument, sourced by
  // the caller from the CALLER's own JWT (never the URL or body, except in
  // createTenantAdmin — see its own comment). Every query is filtered by
  // it — this is the actual enforcement of the row-level tenant isolation
  // the architecture plan calls for. findOne, update, updateRole,
  // updateStatus and remove all match on `{ _id: id, tenantId }` together,
  // so a user id from a different tenant comes back as a plain 404 — it
  // never leaks that the id exists elsewhere.

  // Called from UsersController — a COMPANY admin adding a teammate within
  // their own tenant. Role is whatever the dto specifies (COMPANY/EMPLOYEE/
  // USER — never ADMIN, enforced by CreateUserByAdminDto's validation).
  async create(tenantId: string, dto: CreateUserByAdminDto): Promise<PublicUser> {
    return this.createUserRecord(tenantId, dto, dto.role ?? UserRole.USER);
  }

  // Called from TenantController — a platform ADMIN provisioning a tenant's
  // first (or an additional) COMPANY admin. `tenantId` here comes from the
  // :id route param on /tenant/:id/admin, already validated by
  // TenantController against the Tenant collection — NOT from a JWT, since
  // the caller (a platform admin) has no tenant of their own.
  async createTenantAdmin(tenantId: string, dto: CreateTenantAdminDto): Promise<PublicUser> {
    return this.createUserRecord(tenantId, dto, UserRole.COMPANY);
  }

  async findAll(tenantId: string, page = 1, limit = 10) {
    const safePage = Math.max(1, Math.trunc(Number(page)) || 1);
    const safeLimit = Math.min(100, Math.max(1, Math.trunc(Number(limit)) || 10));
    const skip = (safePage - 1) * safeLimit;

    const filter = { tenantId };
    const [users, total] = await Promise.all([
      this.userModel.find(filter).skip(skip).limit(safeLimit).exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      users: users.map((u) => this.sanitize(u)),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(tenantId: string, id: string): Promise<PublicUser> {
    const user = await this.userModel.findOne({ _id: id, tenantId }).exec();
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return this.sanitize(user);
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto): Promise<PublicUser> {
    const updated = await this.userModel
      .findOneAndUpdate({ _id: id, tenantId }, { $set: dto }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return this.sanitize(updated);
  }

  async updateRole(
    tenantId: string,
    id: string,
    dto: UpdateUserRoleDto,
    requestingUserId: string,
  ): Promise<PublicUser> {
    if (id === requestingUserId) {
      throw new ForbiddenException('You cannot change your own role');
    }
    const updated = await this.userModel
      .findOneAndUpdate({ _id: id, tenantId }, { $set: { role: dto.role } }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return this.sanitize(updated);
  }

  async updateStatus(
    tenantId: string,
    id: string,
    dto: UpdateUserStatusDto,
    requestingUserId: string,
  ): Promise<PublicUser> {
    if (id === requestingUserId && !dto.isActive) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }
    const updated = await this.userModel
      .findOneAndUpdate({ _id: id, tenantId }, { $set: { isActive: dto.isActive } }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return this.sanitize(updated);
  }

  async remove(tenantId: string, id: string, requestingUserId: string) {
    if (id === requestingUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    const result = await this.userModel.deleteOne({ _id: id, tenantId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return { deleted: true, id };
  }
}
