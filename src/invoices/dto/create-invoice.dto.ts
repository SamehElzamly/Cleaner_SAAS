import { IsDateString, IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

// No tenantId, amounts or customer data: all of that is read from the
// booking server-side, so a client can't invoice an arbitrary amount.
export class CreateInvoiceDto {
  @IsMongoId({ message: 'bookingId must be a valid id' })
  bookingId: string;

  // Percent, e.g. 14 for 14% VAT. Defaults to 0.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() notes?: string;
}
