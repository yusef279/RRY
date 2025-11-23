import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreateTemplateDto,
  CreateCycleDto,
  CreateAssignmentDto,
  SubmitRecordDto
} from './dto/performance.dto';
import { AppraisalTemplate, AppraisalTemplateDocument } from './models/appraisal-template.schema';
import { AppraisalCycle, AppraisalCycleDocument } from './models/appraisal-cycle.schema';
import { AppraisalAssignment, AppraisalAssignmentDocument } from './models/appraisal-assignment.schema';
import { AppraisalRecord, AppraisalRecordDocument } from './models/appraisal-record.schema';
import { AppraisalDispute, AppraisalDisputeDocument } from './models/appraisal-dispute.schema';
import { EmployeeProfile, EmployeeProfileDocument } from '../employee-profile/models/employee-profile.schema';
import { AppraisalCycleStatus, AppraisalAssignmentStatus, AppraisalRecordStatus, AppraisalDisputeStatus } from './enums/performance.enums';

@Injectable()
export class PerformanceService {
  constructor(
    @InjectModel(AppraisalTemplate.name) private templateModel: Model<AppraisalTemplateDocument>,
    @InjectModel(AppraisalCycle.name) private cycleModel: Model<AppraisalCycleDocument>,
    @InjectModel(AppraisalAssignment.name) private assignmentModel: Model<AppraisalAssignmentDocument>,
    @InjectModel(AppraisalRecord.name) private recordModel: Model<AppraisalRecordDocument>,
    @InjectModel(AppraisalDispute.name) private disputeModel: Model<AppraisalDisputeDocument>,
    @InjectModel(EmployeeProfile.name) private employeeModel: Model<EmployeeProfileDocument>,
  ) {}

  // -------------------------
  // Templates
  // -------------------------
  async createTemplate(dto: CreateTemplateDto) {
    const template = new this.templateModel(dto);
    return template.save();
  }

  async listTemplates(query: any) {
    return this.templateModel.find(query).exec();
  }

  async getTemplateById(id: string) {
    return this.templateModel.findById(id).exec();
  }

  // -------------------------
  // Cycles
  // -------------------------
  async createCycle(dto: CreateCycleDto) {
    const cycle = new this.cycleModel({ ...dto, status: AppraisalCycleStatus.PLANNED });
    return cycle.save();
  }

  async activateCycle(id: string) {
    const cycle = await this.cycleModel.findById(id);
    if (!cycle) throw new NotFoundException('Cycle not found');
    cycle.status = AppraisalCycleStatus.ACTIVE;
    return cycle.save();
  }

  async listCycles(query: any) {
    return this.cycleModel.find(query).exec();
  }

  // -------------------------
  // Assignments
  // -------------------------
  async bulkAssign(assignments: CreateAssignmentDto[]) {
    if (!assignments || assignments.length === 0) {
      throw new BadRequestException('No assignments provided');
    }

    const preparedAssignments: Partial<CreateAssignmentDto>[] = [];

    for (const dto of assignments) {
      const emp = await this.employeeModel.findById(dto.employeeProfileId);
      if (!emp) continue;

      preparedAssignments.push({
        cycleId: dto.cycleId,
        templateId: dto.templateId,
        employeeProfileId: emp._id,
        managerProfileId: dto.managerProfileId || emp.supervisorPositionId as Types.ObjectId,
        departmentId: emp.primaryDepartmentId as Types.ObjectId,
        positionId: dto.positionId || emp.primaryPositionId as Types.ObjectId,
        status: dto.status || AppraisalAssignmentStatus.NOT_STARTED,
        dueDate: dto.dueDate,
      });
    }

    return this.assignmentModel.insertMany(preparedAssignments);
  }

  async getAssignmentsForManager(managerId: string) {
    return this.assignmentModel.find({ managerProfileId: managerId }).exec();
  }

  // -------------------------
  // Records
  // -------------------------
  async submitRecord(dto: SubmitRecordDto) {
    const record = new this.recordModel(dto);
    record.status = AppraisalRecordStatus.MANAGER_SUBMITTED;
    return record.save();
  }

  async publishRecord(id: string, hrPublishedById?: Types.ObjectId) {
    const record = await this.recordModel.findById(id);
    if (!record) throw new NotFoundException('Record not found');

    record.status = AppraisalRecordStatus.HR_PUBLISHED;
    record.hrPublishedAt = new Date();
    record.publishedByEmployeeId = hrPublishedById;
    return record.save();
  }

  async acknowledgeRecord(id: string, employeeId: Types.ObjectId, comment?: string) {
    const record = await this.recordModel.findById(id);
    if (!record) throw new NotFoundException('Record not found');

    record.employeeAcknowledgedAt = new Date();
    record.employeeAcknowledgementComment = comment;
    return record.save();
  }

  // -------------------------
  // Disputes
  // -------------------------
  async raiseDispute(dto: any) {
    const dispute = new this.disputeModel(dto);
    dispute.status = AppraisalDisputeStatus.OPEN;
    dispute.submittedAt = new Date();
    return dispute.save();
  }

  async resolveDispute(id: string, dto: any) {
    const dispute = await this.disputeModel.findById(id);
    if (!dispute) throw new NotFoundException('Dispute not found');

    dispute.status = dto.status;
    dispute.resolutionSummary = dto.resolutionSummary;
    dispute.resolvedAt = new Date();
    dispute.resolvedByEmployeeId = dto.resolvedBy;
    return dispute.save();
  }

  // -------------------------
  // Dashboard
  // -------------------------
  async dashboardStats() {
    const totalCycles = await this.cycleModel.countDocuments();
    const activeCycles = await this.cycleModel.countDocuments({ status: AppraisalCycleStatus.ACTIVE });
    const totalAssignments = await this.assignmentModel.countDocuments();
    const submittedRecords = await this.recordModel.countDocuments({ status: AppraisalRecordStatus.MANAGER_SUBMITTED });

    return {
      totalCycles,
      activeCycles,
      totalAssignments,
      submittedRecords
    };
  }
}
