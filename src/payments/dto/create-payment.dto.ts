import { IsIn, IsMongoId, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity.js';

// Manual payments: staff recording money they received in person / by
// transfer. "online" is deliberately not allowed here — it can only come from
// the signed gateway webhook.
const MANUAL_METHODS = [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.BANK_TRANSFER] as const;

export class CreatePaymentDto {
  @IsMongoId({ message: 'invoiceId must be a valid id' })
  invoiceId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsIn(MANUAL_METHODS, { message: `method must be one of: ${MANUAL_METHODS.join(', ')}` })
  method: PaymentMethod;

  @IsOptional() @IsString() note?: string;
}
