// src/performance/dto/performance.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, IsMongoId, IsNumber, Min, Max } from 'class-validator';
import { Types } from 'mongoose';
import {
  AppraisalTemplateType,
  AppraisalAssignmentStatus,
  AppraisalDisputeStatus,
  AppraisalRatingScaleType,
} from '../enums/performance.enums';

export class RatingScaleDefinitionDto {
  @IsEnum(AppraisalRatingScaleType)
  type: AppraisalRatingScaleType;

  @IsNumber()
  min: number;

  @IsNumber()
  max: number;

  @IsOptional()
  @IsNumber()
  step?: number;

  @IsArray()
  @IsOptional()
  labels?: string[];
}

export class EvaluationCriterionDto {
  @IsString()
  key: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  details?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  weight?: number;

  @IsOptional()
  @IsNumber()
  maxScore?: number;

  @IsOptional()
  required?: boolean;
}

// -------------------------
// Template DTOs
// -------------------------
export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AppraisalTemplateType)
  templateType: AppraisalTemplateType;

  @IsNotEmpty()
  ratingScale: RatingScaleDefinitionDto;

  @IsArray()
  @IsOptional()
  criteria?: EvaluationCriterionDto[];

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsArray()
  @IsMongoId({ each: true })
  applicableDepartmentIds: Types.ObjectId[];

  @IsArray()
  @IsMongoId({ each: true })
  applicablePositionIds: Types.ObjectId[];

  @IsOptional()
  isActive?: boolean;
}  

// -------------------------
// Cycle DTOs
// -------------------------
export class CreateCycleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AppraisalTemplateType)
  cycleType: AppraisalTemplateType;

  @IsNotEmpty()
  startDate: Date;

  @IsNotEmpty()
  endDate: Date;

  @IsArray()
  templateAssignments: CycleTemplateAssignmentDto[];

  @IsOptional()
  managerDueDate?: Date;

  @IsOptional()
  employeeAcknowledgementDueDate?: Date;
}

export class CycleTemplateAssignmentDto {
  @IsMongoId()
  templateId: Types.ObjectId;

  @IsArray()
  @IsMongoId({ each: true })
  departmentIds: Types.ObjectId[];
}

// -------------------------
// Assignment DTOs
// -------------------------
export class BulkAssignDto {
  @IsArray()
  assignments: CreateAssignmentDto[];
}

export class CreateAssignmentDto {
  @IsMongoId()
  cycleId: Types.ObjectId;

  @IsMongoId()
  templateId: Types.ObjectId;

  @IsMongoId()
  employeeProfileId: Types.ObjectId;

  @IsOptional()
  @IsMongoId()
  managerProfileId?: Types.ObjectId; // optional to fix TS errors

  @IsMongoId()
  departmentId: Types.ObjectId;

  @IsOptional()
  @IsMongoId()
  positionId?: Types.ObjectId;

  @IsOptional()
  @IsEnum(AppraisalAssignmentStatus)
  status?: AppraisalAssignmentStatus;

  @IsOptional()
  dueDate?: Date;
}

// -------------------------
// Record DTOs
// -------------------------
export class SubmitRecordDto {
  @IsMongoId()
  assignmentId: Types.ObjectId;

  @IsMongoId()
  cycleId: Types.ObjectId;

  @IsMongoId()
  templateId: Types.ObjectId;

  @IsMongoId()
  employeeProfileId: Types.ObjectId;

  @IsMongoId()
  managerProfileId: Types.ObjectId;

  @IsArray()
  ratings: RatingEntryDto[];
}

export class RatingEntryDto {
  @IsString()
  key: string;

  @IsString()
  title: string;

  @IsNumber()
  ratingValue: number;

  @IsOptional()
  ratingLabel?: string;

  @IsOptional()
  weightedScore?: number;

  @IsOptional()
  comments?: string;
}

export class PublishRecordDto {
  @IsOptional()
  @IsMongoId()
  hrPublishedById?: Types.ObjectId;
}

export class AcknowledgeRecordDto {
  @IsMongoId()
  employeeId: Types.ObjectId;

  @IsOptional()
  @IsString()
  comment?: string;
}

// -------------------------
// Dispute DTOs
// -------------------------
export class RaiseDisputeDto {
  @IsMongoId()
  appraisalId: Types.ObjectId;

  @IsMongoId()
  assignmentId: Types.ObjectId;

  @IsMongoId()
  cycleId: Types.ObjectId;

  @IsMongoId()
  raisedByEmployeeId: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  details?: string;
}

export class ResolveDisputeDto {
  @IsMongoId()
  resolvedBy: Types.ObjectId;

  @IsEnum(AppraisalDisputeStatus)
  status: AppraisalDisputeStatus;

  @IsOptional()
  @IsString()
  resolutionSummary?: string;
}
