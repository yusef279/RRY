import { IsString, IsOptional, IsBoolean, IsNotEmpty } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Optional – default can be true in the schema
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
