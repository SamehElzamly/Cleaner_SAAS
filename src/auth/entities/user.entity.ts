import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  ADMIN = 'admin',
  COMPANY = 'company',
  EMPLOYEE = 'employee',
  USER = 'user',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

@Schema({ timestamps: true })
export class User {
  // =========================
  // Authentication
  // =========================

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
  })
  email: string;

  @Prop({
    required: true,
    select: false,
  })
  password: string;

  // =========================
  // Personal Information
  // =========================

  @Prop({
    required: true,
    trim: true,
  })
  firstName: string;

  @Prop({
    required: true,
    trim: true,
  })
  lastName: string;

  @Prop({
    required: true,
    trim: true,
  })
  fullName: string;

  @Prop({
    trim: true,
  })
  phone?: string;

  @Prop()
  avatarUrl?: string;

  @Prop({
    type: String,
    enum: Gender,
  })
  gender?: Gender;

  @Prop({
    type: Date,
  })
  dateOfBirth?: Date;

  // =========================
  // Address
  // =========================

  @Prop({
    trim: true,
  })
  address?: string;

  @Prop({
    trim: true,
  })
  city?: string;

  // =========================
  // Company / Tenant
  // =========================

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.USER,
    required: true,
  })
  role: UserRole;

  @Prop({
    type: Types.ObjectId,
    ref: 'Tenant',
    required: function (this: User) {
      return this.role !== UserRole.ADMIN;
    },
    index: true,
  })
  tenantId?: Types.ObjectId;

  @Prop({
    trim: true,
  })
  jobTitle?: string;

  @Prop({
    trim: true,
  })
  department?: string;

  // =========================
  // Account Status
  // =========================

  @Prop({
    default: true,
  })
  isActive: boolean;

  @Prop({
    default: false,
  })
  isEmailVerified: boolean;

  @Prop({
    type: Date,
    default: null,
  })
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// =========================
// Indexes
// =========================

UserSchema.index(
  { email: 1, tenantId: 1 },
  {
    unique: true,
    sparse: true,
  },
);