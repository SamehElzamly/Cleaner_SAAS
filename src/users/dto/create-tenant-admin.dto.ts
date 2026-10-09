import { IsNotEmpty, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

// Used by POST /tenant/:id/admin — platform ADMIN only. Creates a
// COMPANY-role admin for a specific tenant (typically its first one, right
// after the tenant itself is created).
//
// No `role` field: this endpoint only ever creates COMPANY admins, nothing
// else. No `tenantId` field either — it comes from the :id route param and
// is validated against the Tenant collection before any user is created.
export class CreateTenantAdminDto {
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

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;
}
