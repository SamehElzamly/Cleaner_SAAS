import {
    IsEmail,
    IsEnum,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
    ValidateIf,
} from 'class-validator';
import { Gender, UserRole } from '../entities/user.entity.js';

export class CreateUserDto {
    // =========================
    // Authentication
    // =========================

    @IsEmail({}, { message: 'Invalid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    password: string;

    // =========================
    // Personal Information
    // =========================

    @IsString()
    @IsNotEmpty({ message: 'First name is required' })
    firstName: string;

    @IsString()
    @IsNotEmpty({ message: 'Last name is required' })
    lastName: string;

    @IsString()
    @IsNotEmpty({ message: 'Full name is required' })
    fullName: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    avatarUrl?: string;

    @IsOptional()
    @IsEnum(Gender, { message: 'Gender must be either male or female' })
    gender?: Gender;

    @IsOptional()
    dateOfBirth?: Date;

    // =========================
    // Address
    // =========================

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    city?: string;

    // =========================
    // Company / Tenant
    // =========================

    @IsOptional()
    @IsEnum(UserRole, { message: 'Invalid role' })
    role?: UserRole;

    // Required for every role except ADMIN, mirroring the entity's
    // conditional `required` function.
    @ValidateIf((dto: CreateUserDto) => dto.role !== UserRole.ADMIN)
    @IsMongoId({ message: 'tenantId must be a valid Mongo ObjectId' })
    @IsNotEmpty({ message: 'tenantId is required unless role is admin' })
    tenantId?: string;

    @IsOptional()
    @IsString()
    jobTitle?: string;

    @IsOptional()
    @IsString()
    department?: string;
}