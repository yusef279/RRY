import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class RejectStructureChangeRequestDto {
  @IsString()
  @IsNotEmpty()
  approverEmployeeId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  comments?: string;
}
