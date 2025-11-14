// src/performance/schemas/template.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TemplateDocument = Template & Document;

@Schema({ timestamps: true })
export class Template {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  department: string;

  @Prop({ required: true })
  appraisalType: string; // e.g., Annual, Probation

  @Prop([{ 
    criterion: { type: String, required: true }, 
    maxScore: { type: Number, required: true } 
  }])
  criteria: { criterion: string; maxScore: number }[];
}

export const TemplateSchema = SchemaFactory.createForClass(Template);
