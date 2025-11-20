// src/performance/schemas/evaluation.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EvaluationDocument = Evaluation & Document;

@Schema({ timestamps: true })
export class Evaluation {
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
employeeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
managerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Template', required: true })
  templateId: Types.ObjectId;

  @Prop({
type: [
{
criterion: { type: String, required: true },
score: { type: Number, required: true },
},
],
})
ratings: { criterion: string; score: number }[];

  @Prop({ default: '' })
comments: string;

@Prop({ default: false })
 acknowledged: boolean;
 
  @Prop({ enum: ['Pending', 'Submitted', 'Finalized'], default: 'Pending' })
status: string;
}

export const EvaluationSchema = SchemaFactory.createForClass(Evaluation);
