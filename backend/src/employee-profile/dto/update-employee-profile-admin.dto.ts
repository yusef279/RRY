import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsMongoId,
} from 'class-validator';
import {
  ContractType,
  EmployeeStatus,
  Gender,
  MaritalStatus,
  WorkType,
} from '../enums/employee-profile.enums';

export class UpdateEmployeeProfileByAdminDto {
  // Names & PII
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  // Demographics
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  // Contact (overlaps with self-service but HR can also change)
  @IsOptional()
  @IsEmail()
  personalEmail?: string;

  @IsOptional()
  @IsString()
  mobilePhone?: string;

  @IsOptional()
  @IsString()
  homePhone?: string;

  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  // Employment master data
  @IsOptional()
  @IsString()
  employeeNumber?: string;

  @IsOptional()
  @IsDateString()
  dateOfHire?: string;

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

  @IsOptional()
  @IsDateString()
  statusEffectiveFrom?: string;

  // Org Structure links
  @IsOptional()
  @IsMongoId()
  primaryPositionId?: string;

  @IsOptional()
  @IsMongoId()
  primaryDepartmentId?: string;

  @IsOptional()
  @IsMongoId()
  supervisorPositionId?: string;

  // Payroll link
  @IsOptional()
  @IsMongoId()
  payGradeId?: string;
}
