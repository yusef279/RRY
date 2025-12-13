import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  IsMongoId,
} from 'class-validator';

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty()
  code: string; // Unique ID (BR-5)

  // ✅ accept either title OR name (frontend uses "name")
  @ValidateIf((o) => !o.name) // title required if name is missing
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ValidateIf((o) => !o.title) // name required if title is missing
  @IsString()
  @IsNotEmpty()
  name?: string;

  // ✅ make these optional because your UI doesn’t send them
  @IsOptional()
  @IsString()
  jobKey?: string; // BR-10

  // ✅ your DB currently has payGrade as string sometimes ("high", "hifh")
  @IsOptional()
  @IsString()
  payGrade?: string;

  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  departmentId: string; // BR-10

  @IsOptional()
  @IsString()
  costCenter?: string; // BR-30

  @IsOptional()
  @IsString()
  reportsToPositionId?: string; // BR-30

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  performedByEmployeeId?: string;
}
