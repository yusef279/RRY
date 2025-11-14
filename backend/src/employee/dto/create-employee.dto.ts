import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsDateString()
  hireDate: string;

  @IsIn(['FULL_TIME', 'PART_TIME', 'INTERN'])
  contractType: 'FULL_TIME' | 'PART_TIME' | 'INTERN';
}
