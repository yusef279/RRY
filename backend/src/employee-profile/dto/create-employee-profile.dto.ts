import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  ContractType,
  EmployeeStatus,
  Gender,
  MaritalStatus,
  WorkType,
} from '../enums/employee-profile.enums';

export class CreateEmployeeProfileDto {
  // ----- UserProfileBase (core PII) -----

  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsString()
  nationalId: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEmail()
  personalEmail?: string;

  @IsOptional()
  @IsString()
  mobilePhone?: string;

  // ----- EmployeeProfile fields -----

  @IsString()
  employeeNumber: string; // HR/Payroll number (unique)

  @IsDateString()
  dateOfHire: string;

  @IsOptional()
  @IsEmail()
  workEmail?: string;

  @IsOptional()
  @IsString()
  biography?: string;

  @IsOptional()
  @IsDateString()
  contractStartDate?: string;

  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @IsOptional()
  @IsEnum(ContractType)
  contractType?: ContractType;

  @IsOptional()
  @IsEnum(WorkType)
  workType?: WorkType;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  // ----- Org Structure links -----

  @IsOptional()
  @IsMongoId()
  primaryPositionId?: string;

  @IsOptional()
  @IsMongoId()
  primaryDepartmentId?: string;

  @IsOptional()
  @IsMongoId()
  supervisorPositionId?: string;

  // ----- Payroll link -----

  @IsOptional()
  @IsMongoId()
  payGradeId?: string;
}
