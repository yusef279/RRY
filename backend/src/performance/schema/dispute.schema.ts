// src/performance/schemas/dispute.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DisputeDocument = Dispute & Document;

@Schema({ timestamps: true })
export class Dispute {
  @Prop({ type: Types.ObjectId, ref: 'Evaluation', required: true })
  evaluationId: Types.ObjectId;

  @Prop({ required: true })
  employeeId: number;

  @Prop({ required: true })
  reason: string;

  @Prop()
  hrDecision: string;

  @Prop({ default: 'Open' })
  status: string; // Open, Resolved
}

export const DisputeSchema = SchemaFactory.createForClass(Dispute);
