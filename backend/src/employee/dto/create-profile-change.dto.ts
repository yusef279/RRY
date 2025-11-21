import { IsMongoId, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateProfileChangeRequestDto {
  @IsMongoId()
  employeeId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsNotEmpty()
  @IsObject()
  changes: Record<string, { oldValue: any; newValue: any }>;
}
