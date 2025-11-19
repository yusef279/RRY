// src/performance/performance.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PerformanceService } from './performance.service';
import { PerformanceController } from './performance.controller';
import { Template, TemplateSchema } from './schema/template.schema';
import { Evaluation, EvaluationSchema } from './schema/evaluation.schema';
import { Dispute, DisputeSchema } from './schema/dispute.schema';
import {
  AppraisalCycle,
  AppraisalCycleSchema,
} from './schema/appraisalCycle.schema';
import { EmployeeModule } from '../employee/employee.module';
import { OrgStructureModule } from '../org-structure/org-structure.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Template.name, schema: TemplateSchema },
      { name: Evaluation.name, schema: EvaluationSchema },
      { name: Dispute.name, schema: DisputeSchema },
      { name: AppraisalCycle.name, schema: AppraisalCycleSchema },

    ]),
      EmployeeModule,
    OrgStructureModule,
  ],
  controllers: [PerformanceController],
  providers: [PerformanceService],
})
export class PerformanceModule {}
