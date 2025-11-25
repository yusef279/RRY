import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEmployeeProfileChangeRequestDto {
  @IsString()
  @MaxLength(1000)
  requestDescription: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
