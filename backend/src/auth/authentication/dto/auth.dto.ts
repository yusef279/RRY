import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { UserRole } from '../../authorization/constants/roles.constant';

export class RegisterDto {
  @IsEmail() 
  email!: string;

  @IsString() 
  @MinLength(6) 
  password!: string;

  @IsString() 
  firstName!: string;

  @IsString() 
  lastName!: string;

  @IsString()
  nationalId!: string;

  @IsString()
  employeeNumber!: string;

  @IsDateString()
  dateOfHire!: string; // Format: YYYY-MM-DD

  @IsEnum(UserRole) 
  role!: UserRole;

  @IsOptional() 
  @IsString() 
  employeeId?: string;

  @IsOptional() 
  @IsString() 
  departmentId?: string;
}

export class LoginDto {
  @IsEmail(undefined, { message: 'Please provide a valid email' })
  email!: string;

  @IsString() 
  password!: string;
}