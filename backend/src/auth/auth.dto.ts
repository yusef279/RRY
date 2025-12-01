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

  @IsString()
  @IsNotEmpty({ message: 'National ID is required' })
  nationalId: string;

  @IsString()
  @IsNotEmpty({ message: 'Employee number is required' })
  employeeNumber: string;

  @IsDateString()
  @IsNotEmpty({ message: 'Date of hire is required' })
  dateOfHire: string; // Format: YYYY-MM-DD

  @IsEnum(SystemRole, { message: 'Invalid role. Must be one of: ' + Object.values(SystemRole).join(', ') })
  @IsNotEmpty({ message: 'Role is required' })
  role: SystemRole;

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