import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsMongoId } from 'class-validator';


export class CreateTemplateDto {
@IsString() @IsNotEmpty()
name: string;


@IsArray() @IsNotEmpty()
criteria: string[];


@IsNumber() @IsNotEmpty()
ratingScale: number;


@IsOptional() @IsArray()
@IsMongoId({ each: true })
departmentIds?: string[];
}