import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsOptional()
  @IsString()
  reportsTo?: string;

  @IsOptional()
  @IsNumber()
  payGrade?: number;
}
