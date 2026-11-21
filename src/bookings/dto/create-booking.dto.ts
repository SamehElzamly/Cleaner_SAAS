import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';

// No tenantId (from the JWT). customerId/serviceId/branchId/staffId are
// verified in the service to belong to that same tenant.
export class CreateBookingDto {
  @IsMongoId() customerId: string;
  @IsMongoId() serviceId: string;
  @IsMongoId() branchId: string;

  // Optional: a booking can be created unassigned and staffed later.
  @IsOptional() @IsMongoId() staffId?: string;

  // ISO 8601. Include the offset so the instant is unambiguous,
  // e.g. "2026-11-02T09:00:00+02:00" or "2026-11-02T07:00:00Z".
  @IsDateString()
  scheduledAt: string;

  // Units of the service (rooms, hours...). price = basePrice x quantity and
  // duration = durationMinutes x quantity.
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20)
  quantity?: number;

  @IsOptional() @IsString() address?: string; // defaults to the customer's address
  @IsOptional() @IsString() notes?: string;
}
