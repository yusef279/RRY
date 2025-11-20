import { IsMongoId, IsNotEmpty, IsOptional, IsObject, IsString } from 'class-validator';


export class CreateEvaluationDto {
@IsMongoId() @IsNotEmpty() cycleId: string;
@IsMongoId() @IsNotEmpty() employeeId: string;
@IsMongoId() @IsNotEmpty() managerId: string;
@IsOptional() @IsObject() scores?: Record<string, number>;
@IsOptional() @IsString() comments?: string;
}