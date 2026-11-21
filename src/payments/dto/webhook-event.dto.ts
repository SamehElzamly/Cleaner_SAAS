import { IsIn, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

// The contract this API expects from a payment gateway (or from an adapter
// you put in front of one — real gateways each have their own payload and
// signature scheme, so Paymob/Stripe/etc. need a thin translation layer).
export class WebhookEventDto {
  // Unique per event; the idempotency key.
  @IsString() @IsNotEmpty() eventId: string;

  @IsIn(['payment.succeeded', 'payment.failed'])
  type: 'payment.succeeded' | 'payment.failed';

  @IsMongoId() invoiceId: string;

  @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive()
  amount: number;

  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() provider?: string; // defaults to "gateway"
  @IsOptional() @IsString() failureReason?: string;
}
