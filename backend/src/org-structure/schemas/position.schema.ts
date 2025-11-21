import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PositionDocument = Position & Document;

@Schema({ timestamps: true })
export class Position {
  @Prop({ required: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: true })
  departmentId: Types.ObjectId;

  // Reporting line
  @Prop({ type: Types.ObjectId, ref: 'Position', default: null })
  reportsTo: Types.ObjectId;

  // Optional description (e.g., job summary)
  @Prop({ type: String, default: null })
  description: string | null;

  // Optional - integration with Employee Profile
  @Prop({ type: String, default: null })
  employeeAssigned: string;

  // Numeric pay grade for payroll integration
  @Prop({ type: Number, default: null })
  payGrade: number;

  // Active flag – aligns with service
  @Prop({ default: true })
  isActive: boolean;

  // Vacancy flag – used by recruitment/org chart
  @Prop({ default: true })
  isVacant: boolean;

  // Delimiting for history
  @Prop({ type: Date, default: null })
  closedDate: Date | null;
}

export const PositionSchema = SchemaFactory.createForClass(Position);
