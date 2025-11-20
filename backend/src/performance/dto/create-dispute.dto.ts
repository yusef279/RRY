import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';


export class CreateDisputeDto {
@IsMongoId() @IsNotEmpty() evaluationId: string;
@IsString() @IsNotEmpty() reason: string;
@IsOptional() @IsString() employeeComments?: string;
}