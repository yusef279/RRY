import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { AppraisalTemplateDocument } from './models/appraisal-template.schema';
import { AppraisalCycleDocument } from './models/appraisal-cycle.schema';
import { AppraisalAssignmentDocument } from './models/appraisal-assignment.schema';
import { AppraisalRecordDocument } from './models/appraisal-record.schema';
import { AppraisalDisputeDocument } from './models/appraisal-dispute.schema';

// At the top of your service file
import { AppraisalCycleStatus,AppraisalRecordStatus,AppraisalAssignmentStatus } from './enums/performance.enums'; // adjust the path to where your enum is


@Injectable()
export class PerformanceService {
  constructor(
    @InjectModel('AppraisalTemplate') private templateModel: Model<AppraisalTemplateDocument>,
    @InjectModel('AppraisalCycle') private cycleModel: Model<AppraisalCycleDocument>,
    @InjectModel('AppraisalAssignment') private assignmentModel: Model<AppraisalAssignmentDocument>,
    @InjectModel('AppraisalRecord') private recordModel: Model<AppraisalRecordDocument>,
    @InjectModel('AppraisalDispute') private disputeModel: Model<AppraisalDisputeDocument>,
  ) {}

  // Templates
  async createTemplate(createDto: any) {
    const exists = await this.templateModel.findOne({ name: createDto.name }).lean();
    if (exists) throw new BadRequestException('Template with that name already exists');
    const created = await this.templateModel.create(createDto);
    return created;
  }

  async listTemplates(query = {}) {
    return this.templateModel.find(query).lean();
  }

  async getTemplateById(id: string) {
    const doc = await this.templateModel.findById(id).lean();
    if (!doc) throw new NotFoundException('Template not found');
    return doc;
  }

  // Cycles
  async createCycle(dto: any) {
    const created = await this.cycleModel.create(dto);
    return created;
  }

async activateCycle(cycleId: string) {
  const cycle = await this.cycleModel.findById(cycleId);
  if (!cycle) throw new NotFoundException('Cycle not found');

  cycle.status = AppraisalCycleStatus.ACTIVE; // ✅ use enum
  cycle.publishedAt = new Date();
  await cycle.save();

  // assignment generation (bulk) could be added here via templateAssignments
  return cycle;
}

  async listCycles(query = {}) {
    return this.cycleModel.find(query).lean();
  }

  // Assignments
  async bulkAssign(assignments: any[]) {
    if (!Array.isArray(assignments) || assignments.length === 0) return [];
    const docs = assignments.map(a => ({
      ...a,
      assignedAt: a.assignedAt ? new Date(a.assignedAt) : new Date(),
      status: a.status || 'NOT_STARTED',
    }));
    const created = await this.assignmentModel.insertMany(docs);
    return created;
  }

  async getAssignmentsForManager(managerId: string) {
    return this.assignmentModel.find({ managerProfileId: managerId }).lean();
  }

  // Records
  async submitRecord(dto: any) {
    // dto must contain assignmentId, cycleId, templateId, employeeProfileId, managerProfileId, ratings
    const rec = await this.recordModel.create({
      ...dto,
      status: 'MANAGER_SUBMITTED',
      managerSubmittedAt: new Date(),
    });

    // update assignment
    await this.assignmentModel.findByIdAndUpdate(dto.assignmentId, {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      latestAppraisalId: rec._id,
    });

    return rec;
  }

async publishRecord(recordId: string, hrPublishedById?: string) {
  const rec = await this.recordModel.findById(recordId);
  if (!rec) throw new NotFoundException('Appraisal record not found');

  rec.status = AppraisalRecordStatus.HR_PUBLISHED; // ✅ use enum
  rec.hrPublishedAt = new Date();
  if (hrPublishedById) rec.publishedByEmployeeId = new Types.ObjectId(hrPublishedById);
  await rec.save();

  // update assignment
  await this.assignmentModel.findByIdAndUpdate(rec.assignmentId, {
    status: AppraisalAssignmentStatus.PUBLISHED, // ✅ use enum
    publishedAt: new Date(),
  });

  return rec;
}

  async acknowledgeRecord(recordId: string, employeeId: string, comment?: string) {
    const rec = await this.recordModel.findById(recordId);
    if (!rec) throw new NotFoundException('Record not found');
    rec.employeeViewedAt = new Date();
    rec.employeeAcknowledgedAt = new Date();
    rec.employeeAcknowledgementComment = comment;
    await rec.save();

    await this.assignmentModel.findOneAndUpdate({ _id: rec.assignmentId }, { status: 'ACKNOWLEDGED' });
    return rec;
  }

  // Disputes
  async raiseDispute(dto: any) {
    const dispute = await this.disputeModel.create({
      ...dto,
      submittedAt: new Date(),
      status: 'OPEN',
    });
    // optionally notify HR
    return dispute;
  }

  async resolveDispute(disputeId: string, payload: { status: string; resolutionSummary?: string; resolvedBy?: string }) {
    const d = await this.disputeModel.findById(disputeId);
    if (!d) throw new NotFoundException('Dispute not found');
    d.status = payload.status as any;
    d.resolutionSummary = payload.resolutionSummary;
    d.resolvedAt = new Date();
    if (payload.resolvedBy) d.resolvedByEmployeeId = new Types.ObjectId(payload.resolvedBy);
    await d.save();
    return d;
  }

  // Reporting / Dashboard
  async dashboardStats() {
    const totalCycles = await this.cycleModel.countDocuments();
    const activeAssignments = await this.assignmentModel.countDocuments({ status: 'IN_PROGRESS' });
    const submitted = await this.recordModel.countDocuments({ status: 'MANAGER_SUBMITTED' });
    return { totalCycles, activeAssignments, submitted };
  }
}