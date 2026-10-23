import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateStaffDto } from './create-staff.dto.js';

// userId can't change (it's the identity of the profile) and availability
// has its own endpoint (PATCH /staff/:id/availability).
export class UpdateStaffDto extends PartialType(
  OmitType(CreateStaffDto, ['userId', 'availability'] as const),
) {}
