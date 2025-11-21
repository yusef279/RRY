import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  // Optional reporting line
  @IsOptional()
  @IsString()
  reportsTo?: string;

  // Optional description (for clarity in org chart)
  @IsOptional()
  @IsString()
  description?: string;

  // Optional numeric pay grade (aligned with payroll integration)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  payGrade?: number;
}
