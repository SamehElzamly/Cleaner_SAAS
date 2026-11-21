import { IsDateString, IsOptional, IsString } from 'class-validator';

// Reschedule / edit details only. Changing the service or quantity changes
// price and duration, so that is done by canceling and re-booking instead.
export class UpdateBookingDto {
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() notes?: string;
}
