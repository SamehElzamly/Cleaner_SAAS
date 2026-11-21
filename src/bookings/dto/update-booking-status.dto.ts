import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BookingStatus } from '../enums/booking-status.enum.js';

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus)
  status: BookingStatus;

  // Only used when status is "canceled".
  @IsOptional() @IsString() cancelReason?: string;
}
