import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProfileChangeStatus } from '../enums/employee-profile.enums';

export class ReviewChangeRequestDto {
  @IsEnum(ProfileChangeStatus)
  decision: ProfileChangeStatus; // should be APPROVED or REJECTED

  @IsOptional()
  @IsString()
  comment?: string;
}
