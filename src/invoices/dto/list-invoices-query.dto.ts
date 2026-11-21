import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';
import { InvoiceStatus } from '../entities/invoice.entity.js';

export class ListInvoicesQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;

  @IsOptional() @IsEnum(InvoiceStatus) status?: InvoiceStatus;
  @IsOptional() @IsMongoId() customerId?: string;

  // issuedAt >= from AND issuedAt < to
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
