import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CleaningServiceDocument = HydratedDocument<CleaningService>;

// Named CleaningService (not "Service") to avoid colliding with NestJS's
// own "service" vocabulary everywhere else in the codebase.
@Schema({ timestamps: true, collection: 'services' })
export class CleaningService {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, min: 0 })
  basePrice: number;

  @Prop({ required: true, min: 1 })
  durationMinutes: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const CleaningServiceSchema = SchemaFactory.createForClass(CleaningService);
CleaningServiceSchema.index({ tenantId: 1, name: 1 }, { unique: true });
