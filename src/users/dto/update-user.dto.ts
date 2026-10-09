import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { Gender } from '../../auth/entities/user.entity.js';

// No email, password, role or isActive here on purpose:
// - email/password changes belong in a dedicated, re-authenticated flow
//   (not built yet — out of scope for this phase).
// - role and isActive each have their own endpoint (update-user-role.dto,
//   update-user-status.dto) so they can carry stricter rules (e.g. "you
//   can't change your own role") without weakening a general profile edit.
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

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
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  department?: string;
}
