import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';


export type TemplateDocument = Template & Document;

@Schema({ timestamps: true })
export class Template {
@Prop({ required: true })
name: string;

@Prop({ type: [String], required: true })
criteria: string[];

@Prop({ required: true })
ratingScale: number;

@Prop({ type: [Types.ObjectId], ref: 'Department', default: [] })
departmentIds: Types.ObjectId[];
}

export const TemplateSchema = SchemaFactory.createForClass(Template);