import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateEmployeeProfileChangeRequestDto {
  @IsString()
  @MaxLength(200)
  fieldName: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  currentValue?: string;

  @IsString()
  @MaxLength(500)
  requestedValue: string;

  @IsString()
  @MaxLength(1000)
  requestDescription: string; // ✅ THIS is required by schema


}
