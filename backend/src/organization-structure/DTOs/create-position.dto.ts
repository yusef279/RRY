import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty()
  code: string; // Unique ID (BR-5)

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  jobKey: string; // BR-10

  @IsNumber()
  payGrade: number; // BR-10

  @IsString()
  @IsNotEmpty()
  departmentId: string; // BR-10

  @IsString()
  @IsNotEmpty()
  costCenter: string; // BR-30

  @IsString()
  @IsNotEmpty()
  reportsToPositionId: string; // BR-30

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  performedByEmployeeId?: string;
}
