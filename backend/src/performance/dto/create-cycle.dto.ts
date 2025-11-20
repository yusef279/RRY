import { IsArray, IsDateString, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';


export class CreateCycleDto {
@IsString() @IsNotEmpty()
name: string;


@IsDateString() @IsOptional() startDate?: string;
@IsDateString() @IsOptional() endDate?: string;


@IsMongoId() @IsNotEmpty() templateId: string;


@IsOptional() @IsArray() @IsMongoId({ each: true })
assignedEmployees?: string[];
}