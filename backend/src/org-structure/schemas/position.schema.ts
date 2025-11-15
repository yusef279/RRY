import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PositionDocument = Position & Document;

@Schema({ timestamps: true })
export class Position {

  @Prop({ required: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: true })
  departmentId: Types.ObjectId;

  // reporting line
  @Prop({ type: Types.ObjectId, ref: 'Position', default: null })
  reportsTo: Types.ObjectId;

  // optional - integration with employee profile
  @Prop({ type: String, default: null })
  employeeAssigned: string;

  // optional - for payroll sync and grading
  @Prop({ type: String, default: null })
  payGrade: string;

  @Prop({ default: true })
  active: boolean;

  @Prop()
  deactivatedAt: Date;
}

export const PositionSchema = SchemaFactory.createForClass(Position);
