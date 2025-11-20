import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AppraisalCycleDocument = AppraisalCycle & Document;

@Schema({ timestamps: true })
export class AppraisalCycle {
  @Prop({ required: true })
  name: string;

@Prop() startDate: Date;
@Prop() endDate: Date;

@Prop({ enum: ['Upcoming','Active','Closed','Archived'], default: 'Upcoming' })
status: string;

  @Prop({ type: Types.ObjectId, ref: 'AppraisalTemplate', required: true })
  templateId: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'Employee', default: [] })
assignedEmployees: Types.ObjectId[];

}

export const AppraisalCycleSchema =
  SchemaFactory.createForClass(AppraisalCycle);
