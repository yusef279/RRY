// src/performance/schemas/evaluation.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EvaluationDocument = Evaluation & Document;

@Schema({ timestamps: true })
export class Evaluation {
  @Prop({ required: true })
  employeeId: number; // can be replaced with ObjectId later

  @Prop({ required: true })
  managerId: number;

  @Prop({ type: Types.ObjectId, ref: 'Template', required: true })
  templateId: Types.ObjectId;

  @Prop([{ 
    criterion: { type: String, required: true },
    score: { type: Number, required: true } 
  }])
  ratings: { criterion: string; score: number }[];

  @Prop()
  comments: string;

  @Prop({ default: 'Pending' })
  status: string; // Pending, Submitted, Finalized
}

export const EvaluationSchema = SchemaFactory.createForClass(Evaluation);
