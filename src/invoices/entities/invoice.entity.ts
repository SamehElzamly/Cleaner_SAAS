import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum InvoiceStatus {
  ISSUED = 'issued',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  VOID = 'void',
}

export type InvoiceDocument = HydratedDocument<Invoice>;

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true })
  bookingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId: Types.ObjectId;

  @Prop({ required: true })
  invoiceNumber: string;

  @Prop({ required: true, uppercase: true })
  currency: string;

  // Everything below is a SNAPSHOT: an issued invoice must never change
  // because a service price or customer record is edited later.
  @Prop({
    type: [{ _id: false, description: String, quantity: Number, unitPrice: Number, total: Number }],
    default: [],
  })
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];

  @Prop({
    type: { _id: false, name: String, phone: String, email: String, address: String },
    default: {},
  })
  customer: { name?: string; phone?: string; email?: string; address?: string };

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ required: true, min: 0, max: 100, default: 0 })
  taxRate: number; // percent

  @Prop({ required: true, min: 0, default: 0 })
  taxAmount: number;

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({ required: true, min: 0, default: 0 })
  amountPaid: number;

  @Prop({ type: String, enum: InvoiceStatus, default: InvoiceStatus.ISSUED })
  status: InvoiceStatus;

  @Prop({ type: Date, required: true })
  issuedAt: Date;

  @Prop({ type: Date, default: null })
  dueDate?: Date | null;

  @Prop({ type: Date, default: null })
  paidAt?: Date | null;

  @Prop({ type: Date, default: null })
  voidedAt?: Date | null;

  @Prop({ trim: true })
  voidReason?: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

InvoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
// One invoice per booking, enforced by the database (a check-then-insert
// alone races under concurrent requests).
InvoiceSchema.index({ tenantId: 1, bookingId: 1 }, { unique: true });
InvoiceSchema.index({ tenantId: 1, issuedAt: -1 });
