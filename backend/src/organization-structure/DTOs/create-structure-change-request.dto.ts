import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { StructureRequestType } from '../enums/organization-structure.enums';

export class CreateStructureChangeRequestDto {
  @IsEnum(StructureRequestType)
  requestType: StructureRequestType;

  @IsString()
  @IsNotEmpty()
  requestedByEmployeeId: string;

  @IsOptional()
  @IsString()
  targetDepartmentId?: string;

  @IsOptional()
  @IsString()
  targetPositionId?: string;

  @IsOptional()
  details?: any; // JSON object

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  requestNumber?: string;
}
