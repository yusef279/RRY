import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { Department, DepartmentSchema } from '../organization-structure/models/department.schema';
import { Position, PositionSchema } from '../organization-structure/models/position.schema';
import { EmployeeProfile, EmployeeProfileSchema } from '../employee-profile/models/employee-profile.schema';
import {
  AppraisalTemplate,
  AppraisalTemplateSchema,
} from './models/appraisal-template.schema';
import {
  AppraisalCycle,
  AppraisalCycleSchema,
} from './models/appraisal-cycle.schema';
import {
  AppraisalAssignment,
  AppraisalAssignmentSchema,
} from './models/appraisal-assignment.schema';
import {
  AppraisalRecord,
  AppraisalRecordSchema,
} from './models/appraisal-record.schema';
import {
  AppraisalDispute,
  AppraisalDisputeSchema,
} from './models/appraisal-dispute.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppraisalTemplate.name, schema: AppraisalTemplateSchema },
      { name: AppraisalCycle.name, schema: AppraisalCycleSchema },
      { name: AppraisalAssignment.name, schema: AppraisalAssignmentSchema },
      { name: AppraisalRecord.name, schema: AppraisalRecordSchema },
      { name: AppraisalDispute.name, schema: AppraisalDisputeSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Position.name, schema: PositionSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
    ]),
  ],
  controllers: [PerformanceController],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {}
