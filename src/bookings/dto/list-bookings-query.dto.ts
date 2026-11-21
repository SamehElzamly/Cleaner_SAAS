import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';
import { BookingStatus } from '../enums/booking-status.enum.js';

export class ListBookingsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;

  @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;
  @IsOptional() @IsMongoId() branchId?: string;
  @IsOptional() @IsMongoId() staffId?: string;
  @IsOptional() @IsMongoId() customerId?: string;

  // scheduledAt >= from AND scheduledAt < to
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
