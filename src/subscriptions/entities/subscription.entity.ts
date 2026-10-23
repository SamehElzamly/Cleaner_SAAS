import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SubscriptionStatus } from '../enums/subscription-status.enum.js';

export type SubscriptionDocument = HydratedDocument<Subscription>;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Plan', required: true })
  planId: Types.ObjectId;

  @Prop({ type: String, enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @Prop({ type: Date, required: true })
  startsAt: Date;

  @Prop({ type: Date, required: true })
  renewsAt: Date;

  @Prop({ type: Date, default: null })
  canceledAt?: Date | null;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

// At most ONE active subscription per tenant, enforced by the database
// itself (a service-level "check then insert" alone would race under
// concurrent requests). Canceled/expired rows are unrestricted history.
SubscriptionSchema.index(
  { tenantId: 1 },
  { unique: true, partialFilterExpression: { status: SubscriptionStatus.ACTIVE } },
);
