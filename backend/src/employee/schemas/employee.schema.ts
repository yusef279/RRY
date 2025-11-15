import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EmployeeDocument = Employee & Document;

@Schema({ timestamps: true })
export class Employee {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  phone?: string;

  @Prop()
  profilePhotoUrl?: string;

  @Prop({ required: true })
  hireDate: Date;

  @Prop({
    enum: ['FULL_TIME', 'PART_TIME', 'INTERN'],
    default: 'FULL_TIME',
  })
  contractType: string;

  @Prop({
    enum: ['ACTIVE', 'ON_LEAVE', 'TERMINATED'],
    default: 'ACTIVE',
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'Department', default: null })
  departmentId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Position', default: null })
  positionId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Employee', default: null })
  managerId: Types.ObjectId | null;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
