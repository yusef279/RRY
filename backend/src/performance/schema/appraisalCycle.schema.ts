import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AppraisalCycleDocument = AppraisalCycle & Document;

@Schema({ timestamps: true })
export class AppraisalCycle {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: Types.ObjectId, ref: 'AppraisalTemplate', required: true })
  templateId: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'Position' })
  assignedManagers: Types.ObjectId[];

  @Prop({ default: false })
  isClosed: boolean;
}

export const AppraisalCycleSchema =
  SchemaFactory.createForClass(AppraisalCycle);
