import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DepartmentDocument = Department & Document;

@Schema({ timestamps: true })
export class Department {

  @Prop({ required: true })
  name: string;

  @Prop()
  code: string;

  @Prop()
  description: string;

  @Prop({ default: true })
  active: boolean;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
