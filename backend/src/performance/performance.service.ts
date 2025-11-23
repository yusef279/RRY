import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AppraisalTemplate,
  AppraisalTemplateDocument,
} from './models/appraisal-template.schema';
import {
  AppraisalCycle,
  AppraisalCycleDocument,
} from './models/appraisal-cycle.schema';
import {
  AppraisalAssignment,
  AppraisalAssignmentDocument,
} from './models/appraisal-assignment.schema';
import {
  AppraisalRecord,
  AppraisalRecordDocument,
} from './models/appraisal-record.schema';
import {
  AppraisalDispute,
  AppraisalDisputeDocument,
} from './models/appraisal-dispute.schema';
import { EmployeeProfile, EmployeeProfileDocument } from '../employee-profile/models/employee-profile.schema';
import { Department, DepartmentDocument } from '../organization-structure/models/department.schema';
import { Position, PositionDocument } from '../organization-structure/models/position.schema';
import {
  AppraisalCycleStatus,
  AppraisalRecordStatus,
  AppraisalDisputeStatus,
} from './enums/performance.enums';

@Injectable()
export class PerformanceService {
  constructor(
    @InjectModel(AppraisalTemplate.name)
    private templateModel: Model<AppraisalTemplateDocument>,
    @InjectModel(AppraisalCycle.name)
    private cycleModel: Model<AppraisalCycleDocument>,
    @InjectModel(AppraisalAssignment.name)
    private assignmentModel: Model<AppraisalAssignmentDocument>,
    @InjectModel(AppraisalRecord.name)
    private recordModel: Model<AppraisalRecordDocument>,
    @InjectModel(AppraisalDispute.name)
    private disputeModel: Model<AppraisalDisputeDocument>,
    @InjectModel(EmployeeProfile.name)
    private employeeModel: Model<EmployeeProfileDocument>,
    @InjectModel(Department.name)
    private departmentModel: Model<DepartmentDocument>,
    @InjectModel(Position.name)
    private positionModel: Model<PositionDocument>,
  ) {}

  // ===== TEMPLATES =====
  async createTemplate(dto: any) {
    // Validate referenced departments & positions
    if (dto.applicableDepartmentIds?.length) {
      const validDepts = await this.departmentModel.find({
        _id: { $in: dto.applicableDepartmentIds.map(id => new Types.ObjectId(id)) },
      });
      if (validDepts.length !== dto.applicableDepartmentIds.length)
        throw new BadRequestException('Some department IDs are invalid.');
    }

    if (dto.applicablePositionIds?.length) {
      const validPositions = await this.positionModel.find({
        _id: { $in: dto.applicablePositionIds.map(id => new Types.ObjectId(id)) },
      });
      if (validPositions.length !== dto.applicablePositionIds.length)
        throw new BadRequestException('Some position IDs are invalid.');
    }

    return this.templateModel.create(dto);
  }

  async listTemplates(query: any) {
    return this.templateModel.find().lean();
  }

  async getTemplateById(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid template ID.');
    const template = await this.templateModel.findById(id);
    if (!template) throw new NotFoundException('Template not found.');
    return template;
  }

  // ===== CYCLES =====
  async createCycle(dto: any) {
    return this.cycleModel.create(dto);
  }

  async activateCycle(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid cycle ID.');
    const cycle = await this.cycleModel.findById(id);
    if (!cycle) throw new NotFoundException('Cycle not found.');
    cycle.status = AppraisalCycleStatus.ACTIVE;
    await cycle.save();
    return cycle;
  }

  async listCycles(query: any) {
    return this.cycleModel.find().lean();
  }

  // ===== ASSIGNMENTS =====
  async bulkAssign(dtoArray: any[]) {
    const assignments: AppraisalAssignmentDocument[] = [];

    for (const dto of dtoArray) {
      const emp = await this.employeeModel.findById(dto.employeeProfileId);
      if (!emp) throw new BadRequestException(`Employee ID ${dto.employeeProfileId} not found.`);

      const template = await this.templateModel.findById(dto.templateId);
      if (!template) throw new BadRequestException(`Template ID ${dto.templateId} not found.`);

      const cycle = await this.cycleModel.findById(dto.cycleId);
      if (!cycle) throw new BadRequestException(`Cycle ID ${dto.cycleId} not found.`);

      const assignment = await this.assignmentModel.create({
        employeeProfileId: emp._id,
        managerProfileId: emp.primaryDepartmentId ? emp.primaryDepartmentId : null, // fallback if no manager
        departmentId: emp.primaryDepartmentId,
        positionId: emp.primaryPositionId,
        templateId: template._id,
        cycleId: cycle._id,
        status: AppraisalRecordStatus.DRAFT as unknown as any, // type cast for safety
      });
      assignments.push(assignment);
    }

    return assignments;
  }

  async getAssignmentsForManager(managerId: string) {
    if (!Types.ObjectId.isValid(managerId))
      throw new BadRequestException('Invalid manager ID.');
    return this.assignmentModel.find({ managerProfileId: managerId }).lean();
  }

  // ===== RECORDS =====
  async submitRecord(dto: any) {
    return this.recordModel.create(dto);
  }

  async publishRecord(recordId: string, hrEmployeeId: string) {
    if (!Types.ObjectId.isValid(recordId))
      throw new BadRequestException('Invalid record ID.');
    const record = await this.recordModel.findById(recordId);
    if (!record) throw new NotFoundException('Record not found.');
    record.status = AppraisalRecordStatus.HR_PUBLISHED;
    record.publishedByEmployeeId = new Types.ObjectId(hrEmployeeId);
    record.hrPublishedAt = new Date();
    await record.save();
    return record;
  }

  async acknowledgeRecord(recordId: string, employeeId: string, comment?: string) {
    if (!Types.ObjectId.isValid(recordId))
      throw new BadRequestException('Invalid record ID.');
    const record = await this.recordModel.findById(recordId);
    if (!record) throw new NotFoundException('Record not found.');
    record.status = AppraisalRecordStatus.ARCHIVED; // assume acknowledgement finalizes
    record.employeeAcknowledgedAt = new Date();
    record.employeeAcknowledgementComment = comment;
    await record.save();
    return record;
  }

  // ===== DISPUTES =====
  async raiseDispute(dto: any) {
    if (!Types.ObjectId.isValid(dto.assignmentId))
      throw new BadRequestException('Invalid assignment ID.');
    if (!Types.ObjectId.isValid(dto.appraisalId))
      throw new BadRequestException('Invalid appraisal ID.');

    return this.disputeModel.create({
      ...dto,
      status: AppraisalDisputeStatus.OPEN,
      submittedAt: new Date(),
    });
  }

  async resolveDispute(disputeId: string, body: any) {
    if (!Types.ObjectId.isValid(disputeId))
      throw new BadRequestException('Invalid dispute ID.');
    const dispute = await this.disputeModel.findById(disputeId);
    if (!dispute) throw new NotFoundException('Dispute not found.');
    dispute.status =
      body.approveChange ? AppraisalDisputeStatus.ADJUSTED : AppraisalDisputeStatus.REJECTED;
    dispute.resolutionSummary = body.resolutionSummary;
    dispute.resolvedAt = new Date();
    dispute.resolvedByEmployeeId = new Types.ObjectId(body.resolvedByEmployeeId);
    await dispute.save();
    return dispute;
  }

  // ===== DASHBOARD =====
  async dashboardStats() {
    const totalCycles = await this.cycleModel.countDocuments();
    const totalTemplates = await this.templateModel.countDocuments();
    const totalAssignments = await this.assignmentModel.countDocuments();
    const totalRecords = await this.recordModel.countDocuments();
    const totalDisputes = await this.disputeModel.countDocuments();

    return {
      totalCycles,
      totalTemplates,
      totalAssignments,
      totalRecords,
      totalDisputes,
    };
  }
}
