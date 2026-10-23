import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CustomerDocument = HydratedDocument<Customer>;

// A customer is a person/household the cleaning company serves — a data
// record owned by the tenant, NOT a login account (that's User).
@Schema({ timestamps: true })
export class Customer {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  city?: string;

  @Prop({ trim: true })
  notes?: string;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Phone is unique within a tenant — the natural duplicate-customer check.
CustomerSchema.index({ tenantId: 1, phone: 1 }, { unique: true });
