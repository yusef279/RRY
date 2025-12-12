import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';
import { SystemRole } from '../employee-profile/enums/employee-profile.enums';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  // Optional fields - admin will set these later
  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  employeeNumber?: string;

  @IsOptional()
  @IsDateString()
  dateOfHire?: string; // Format: YYYY-MM-DD

  @IsOptional()
  @IsEnum(SystemRole, { message: 'Invalid role. Must be one of: ' + Object.values(SystemRole).join(', ') })
  role?: SystemRole;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}

export class LoginDto {
  @IsEmail(undefined, { message: 'Please provide a valid email' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}