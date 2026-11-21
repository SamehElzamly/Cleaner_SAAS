import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  ONLINE = 'online', // only ever set by the gateway webhook
}

export enum PaymentStatus {
  PENDING = 'pending', // created, not yet applied to the invoice
  SUCCEEDED = 'succeeded', // applied to the invoice
  FAILED = 'failed',
  // The gateway says money arrived but it couldn't be applied automatically
  // (invoice void / already paid / overpayment / currency mismatch). A human
  // must look at it — this is money received, never silently dropped.
  REVIEW = 'review',
}

export enum PaymentSource {
  MANUAL = 'manual',
  WEBHOOK = 'webhook',
}

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Invoice', required: true, index: true })
  invoiceId: Types.ObjectId;

  @Prop({ required: true, min: 0.01 })
  amount: number;

  @Prop({ required: true, uppercase: true })
  currency: string;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  method: PaymentMethod;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop({ type: String, enum: PaymentSource, required: true })
  source: PaymentSource;

  // Webhook idempotency: the gateway's event id. The unique index below turns
  // a redelivered event into a no-op instead of a double payment.
  @Prop()
  provider?: string;

  @Prop()
  providerReference?: string;

  @Prop({ trim: true })
  note?: string;

  @Prop({ trim: true })
  failureReason?: string;

  @Prop({ type: Date, default: null })
  paidAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  recordedBy?: Types.ObjectId;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index(
  { provider: 1, providerReference: 1 },
  { unique: true, partialFilterExpression: { providerReference: { $type: 'string' } } },
);
PaymentSchema.index({ tenantId: 1, createdAt: -1 });
