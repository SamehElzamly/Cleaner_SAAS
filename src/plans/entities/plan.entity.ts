import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BillingCycle } from '../enums/billing-cycle.enum.js';

export type PlanDocument = HydratedDocument<Plan>;

// Plans are platform-level (shared by every tenant), so — like Tenant —
// this collection intentionally has no tenantId.
@Schema({ timestamps: true })
export class Plan {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ default: 'USD', uppercase: true, trim: true })
  currency: string;

  @Prop({ type: String, enum: BillingCycle, default: BillingCycle.MONTHLY })
  billingCycle: BillingCycle;

  // Limits enforced by the app (maxUsers is enforced in UsersService).
  @Prop({ required: true, min: 1 })
  maxUsers: number;

  @Prop({ required: true, min: 1 })
  maxBranches: number;

  @Prop({ type: [String], default: [] })
  features: string[];

  // Retire a plan without deleting it: existing subscribers keep it, new
  // subscriptions to it are refused.
  @Prop({ default: true })
  isActive: boolean;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
