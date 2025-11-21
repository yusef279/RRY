import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DepartmentDocument = Department & Document;

@Schema({ timestamps: true })
export class Department {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop()
  description: string;

  // ALIGN BOTH DTO + SERVICE + DB
  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  closedDate: Date | null;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
