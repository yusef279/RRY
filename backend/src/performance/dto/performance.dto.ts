// src/performance/dto/performance.dto.ts
import { IsString, IsNotEmpty,ArrayNotEmpty, IsOptional, IsArray, IsEnum, IsMongoId, IsNumber, Min, Max } from 'class-validator';
import { Types } from 'mongoose';
import {
  AppraisalTemplateType,
  AppraisalAssignmentStatus,
  AppraisalDisputeStatus,
  AppraisalRatingScaleType,
} from '../enums/performance.enums';
import { Transform } from 'class-transformer';

// -------------------------
// Rating / Template DTOs
// -------------------------
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

export class CreateTemplateDto {
  @IsArray()
  @ArrayNotEmpty()
  applicableDepartmentIds: string[];

  @IsArray()
  @ArrayNotEmpty()
  applicablePositionIds: string[];

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

  @IsOptional()
  isActive?: boolean;
}

// -------------------------
// Cycle DTOs
// -------------------------
export class CycleTemplateAssignmentDto {
  @IsMongoId()
  templateId: Types.ObjectId;

  @IsArray()
  @IsMongoId({ each: true })
  departmentIds: Types.ObjectId[];
}

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

// -------------------------
// Assignment DTOs
// -------------------------
export class CreateAssignmentDto {
  @IsMongoId()
  cycleId: Types.ObjectId;

  @IsMongoId()
  templateId: Types.ObjectId;

  @IsMongoId()
  employeeProfileId: Types.ObjectId;

  @IsOptional()
  @IsMongoId()
  managerProfileId?: Types.ObjectId;

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

export class BulkAssignDto {
  @IsArray()
  assignments: CreateAssignmentDto[];
}

// -------------------------
// Record DTOs
// -------------------------
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

export class PublishRecordDto {
  @IsOptional()
  @IsString()          // ← accept string from client
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
// In performance.dto.ts
// Create a custom decorator or interceptor

export class RaiseDisputeDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => new Types.ObjectId(value))
  appraisalId: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => new Types.ObjectId(value))
  assignmentId: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => new Types.ObjectId(value))
  cycleId: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => new Types.ObjectId(value))
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
  @IsString() // Add this validator
  resolvedBy: string; // Change from Types.ObjectId to string

  @IsEnum(AppraisalDisputeStatus)
  status: AppraisalDisputeStatus;

  @IsOptional()
  @IsString()
  resolutionSummary?: string;
}
export class UpdateAppraisalRecordDto {
  @IsOptional()
  @IsArray()
  ratings?: any[];
  
  @IsOptional()
  totalScore?: number;
  
  @IsOptional()
  overallRatingLabel?: string;
  
  @IsOptional()
  managerSummary?: string;
  
  @IsOptional()
  strengths?: string;
  
  @IsOptional()
  improvementAreas?: string;
}
