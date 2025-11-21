import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProfileChangeRequestDocument = ProfileChangeRequest & Document;

@Schema({ timestamps: true })
export class ProfileChangeRequest {
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  employeeId: Types.ObjectId;

  @Prop({ type: Object, required: true })
  changes: Record<string, { oldValue: any; newValue: any }>;

  @Prop({
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
  })
  status: string;

  @Prop()
  reason?: string;

  @Prop({ type: Types.ObjectId, ref: 'Employee' })
  approverId?: Types.ObjectId;

  @Prop()
  hrComment?: string;
}

export const ProfileChangeRequestSchema =
  SchemaFactory.createForClass(ProfileChangeRequest);
