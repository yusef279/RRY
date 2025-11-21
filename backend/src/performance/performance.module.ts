import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TemplateSchema } from './schema/template.schema';
import { AppraisalCycleSchema } from './schema/appraisalCycle.schema';
import { EvaluationSchema } from './schema/evaluation.schema';
import { DisputeSchema } from './schema/dispute.schema';
import { PerformanceService } from './performance.service';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PerformanceController } from './performance.controller';
import { EmployeeModule } from '../employee/employee.module';
import { Employee, EmployeeSchema } from '../employee/schemas/employee.schema';


@Module({
imports: [
MongooseModule.forFeature([
{ name: 'Template', schema: TemplateSchema },
{ name: 'AppraisalCycle', schema: AppraisalCycleSchema },
{ name: 'Evaluation', schema: EvaluationSchema },
{ name: 'Dispute', schema: DisputeSchema },
{ name: Employee.name, schema: EmployeeSchema },
]),
],
controllers: [PerformanceController],
providers: [PerformanceService, RolesGuard, JwtAuthGuard],
exports: [PerformanceService],
})
export class PerformanceModule {}