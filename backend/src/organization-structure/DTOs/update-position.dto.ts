import {
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';

export class UpdatePositionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  jobKey?: string;

  @IsOptional()
  @IsNumber()
  payGrade?: number;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  costCenter?: string;

  @IsOptional()
  @IsString()
  reportsToPositionId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  performedByEmployeeId?: string;
}
