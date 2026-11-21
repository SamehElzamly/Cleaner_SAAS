import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';
import { PaymentStatus } from '../entities/payment.entity.js';

export class ListPaymentsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;

  @IsOptional() @IsMongoId() invoiceId?: string;
  @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
}
