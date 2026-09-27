import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { TenantStatus } from '../enums/tenant-status.enum.js';

export type TenantDocument = HydratedDocument<Tenant>;

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  // Distinct from `slug`: this is the actual subdomain used to route
  // requests to this tenant (e.g. "acme" -> acme.0cleaner.com), read by the
  // Tenant Resolver middleware from the request's Host header. Kept as a
  // separate field because a tenant may want to change how it's addressed
  // on the web without touching its internal `slug` (used in API paths,
  // logs, etc.).
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  subdomain: string;

  @Prop({ type: String, enum: TenantStatus, default: TenantStatus.ACTIVE })
  status: TenantStatus;

  // Reference to the tenant's subscription plan (the "plans" collection
  // from Phase 2 of the plan). Nullable for now since that module doesn't
  // exist yet — every tenant just has no plan assigned until then.
  @Prop({ type: Types.ObjectId, ref: 'Plan', required: false, default: null })
  planId: Types.ObjectId | null;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);