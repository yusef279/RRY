import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { SystemRole } from '../enums/employee-profile.enums';

export class SetEmployeeSystemRolesDto {
  @IsArray()
  @IsEnum(SystemRole, { each: true })
  roles: SystemRole[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
