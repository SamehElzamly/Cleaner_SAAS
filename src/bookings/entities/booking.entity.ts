import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BookingStatus } from '../enums/booking-status.enum.js';

export type BookingDocument = HydratedDocument<Booking>;

@Schema({ timestamps: true })
export class Booking {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CleaningService', required: true })
  serviceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true })
  branchId: Types.ObjectId;

  // null until a staff member is assigned.
  @Prop({ type: Types.ObjectId, ref: 'Staff', default: null })
  staffId: Types.ObjectId | null;

  @Prop({ type: Date, required: true })
  scheduledAt: Date;

  @Prop({ type: Date, required: true })
  endsAt: Date;

  // Price/duration are SNAPSHOTS taken at booking time, so editing the
  // service's price later never rewrites what past customers were quoted.
  @Prop({ required: true, min: 1 })
  durationMinutes: number;

  @Prop({ required: true, min: 1, default: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  totalPrice: number;

  @Prop({ type: String, enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ trim: true })
  cancelReason?: string;

  @Prop({ type: Date, default: null })
  canceledAt?: Date | null;

  @Prop({ type: Date, default: null })
  completedAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

BookingSchema.index({ tenantId: 1, scheduledAt: 1 });
BookingSchema.index({ tenantId: 1, staffId: 1, scheduledAt: 1 }); // overlap checks
BookingSchema.index({ tenantId: 1, customerId: 1 });
