import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CounterDocument = HydratedDocument<Counter>;

// Atomic sequence generator (one row per tenant per sequence name), used to
// hand out invoice numbers INV-000001, INV-000002, ... without duplicates
// even when two invoices are created at the same instant.
@Schema({ collection: 'counters' })
export class Counter {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true, default: 0 })
  seq: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
