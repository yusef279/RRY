import { IsOptional, IsString, IsDateString } from 'class-validator';

export class DeactivatePositionDto {
  @IsOptional()
  @IsDateString()
  closedAt?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  performedByEmployeeId?: string;
}
