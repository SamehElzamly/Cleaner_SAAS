import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsMongoId, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { AvailabilitySlotDto } from './availability-slot.dto.js';

// No tenantId — from the caller's JWT. userId and branchId are verified in
// the service to belong to that same tenant.
export class CreateStaffDto {
  @IsMongoId({ message: 'userId must be a valid id' })
  userId: string;

  @IsMongoId({ message: 'branchId must be a valid id' })
  branchId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availability?: AvailabilitySlotDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
