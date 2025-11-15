// src/performance/performance.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PerformanceService } from './performance.service';
import { PerformanceController } from './performance.controller';
import { Template, TemplateSchema } from './schema/template.schema';
import { Evaluation, EvaluationSchema } from './schema/evaluation.schema';
import { Dispute, DisputeSchema } from './schema/dispute.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Template.name, schema: TemplateSchema },
      { name: Evaluation.name, schema: EvaluationSchema },
      { name: Dispute.name, schema: DisputeSchema },
    ]),
  ],
  controllers: [PerformanceController],
  providers: [PerformanceService],
})
export class PerformanceModule {}
