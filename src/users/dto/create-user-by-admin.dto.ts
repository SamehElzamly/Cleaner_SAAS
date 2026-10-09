import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../auth/entities/user.entity.js';

// `tenantId` is intentionally absent — UsersService.create() always forces
// it to the CALLER's own tenantId (from the JWT), so one tenant's admin can
// never create a user inside another tenant.
//
// `role` is restricted to non-platform roles — ADMIN can never be assigned
// through a tenant-scoped endpoint, no matter who's calling it.
const ASSIGNABLE_ROLES = [UserRole.COMPANY, UserRole.EMPLOYEE, UserRole.USER] as const;

export class CreateUserByAdminDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName: string;

  // Defaults to UserRole.USER in the service if omitted.
  @IsOptional()
  @IsIn(ASSIGNABLE_ROLES, {
    message: `role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`,
  })
  role?: UserRole;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  department?: string;
}
