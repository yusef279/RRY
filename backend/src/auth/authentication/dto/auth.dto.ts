import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../authorization/constants/roles.constant';

export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(6) password!: string;
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsEnum(UserRole) role!: UserRole;
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsString() departmentId?: string;
}

export class LoginDto {
  @IsString() nationalId!: string; // username
  @IsString() password!: string;
}