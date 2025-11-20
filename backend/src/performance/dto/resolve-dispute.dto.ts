import { IsEnum, IsOptional, IsString } from 'class-validator';


export class ResolveDisputeDto {
@IsEnum(['Resolved','Rejected']) status: 'Resolved' | 'Rejected';
@IsOptional() @IsString() hrDecision?: string;
}