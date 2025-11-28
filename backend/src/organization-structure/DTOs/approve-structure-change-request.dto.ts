import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApproveStructureChangeRequestDto {
  @IsString()
  @IsNotEmpty()
  approverEmployeeId: string;

  @IsOptional()
  @IsString()
  comments?: string;
}
