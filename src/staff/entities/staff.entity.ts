import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StaffDocument = HydratedDocument<Staff>;

@Schema({ timestamps: true })
export class Staff {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  // The login account this staff profile belongs to.
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  skills: string[];

  // Weekly recurring availability. dayOfWeek: 0 = Sunday ... 6 = Saturday.
  // Times are 24h "HH:mm" strings (lexicographic order == time order).
  @Prop({
    type: [{ _id: false, dayOfWeek: Number, startTime: String, endTime: String }],
    default: [],
  })
  availability: { dayOfWeek: number; startTime: string; endTime: string }[];

  @Prop({ default: true })
  isActive: boolean;
}

export const StaffSchema = SchemaFactory.createForClass(Staff);

// One staff profile per user per tenant.
StaffSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
