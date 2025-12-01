import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreateTemplateDto,
  CreateCycleDto,
  CreateAssignmentDto,
  BulkAssignDto,
  SubmitRecordDto,
  PublishRecordDto,
  AcknowledgeRecordDto,
  RaiseDisputeDto,
  ResolveDisputeDto,
} from './dto/performance.dto';
import { AppraisalTemplate, AppraisalTemplateDocument } from './models/appraisal-template.schema';
import { AppraisalCycle, AppraisalCycleDocument } from './models/appraisal-cycle.schema';
import { AppraisalAssignment, AppraisalAssignmentDocument } from './models/appraisal-assignment.schema';
import { AppraisalRecord, AppraisalRecordDocument } from './models/appraisal-record.schema';
import { AppraisalDispute, AppraisalDisputeDocument } from './models/appraisal-dispute.schema';
import { EmployeeProfile, EmployeeProfileDocument } from '../employee-profile/models/employee-profile.schema';
import { Department, DepartmentDocument } from '../organization-structure/models/department.schema';
import { Position, PositionDocument } from '../organization-structure/models/position.schema';
import {
  AppraisalCycleStatus,
  AppraisalAssignmentStatus,
  AppraisalRecordStatus,
  AppraisalDisputeStatus,
} from './enums/performance.enums';
import { AuthUser } from '../auth/auth-user.interface';
import { UserRole } from '../auth/permissions.constant';

@Injectable()
export class PerformanceService {
  constructor(
    @InjectModel(AppraisalTemplate.name) private templateModel: Model<AppraisalTemplateDocument>,
    @InjectModel(AppraisalCycle.name) private cycleModel: Model<AppraisalCycleDocument>,
    @InjectModel(AppraisalAssignment.name) private assignmentModel: Model<AppraisalAssignmentDocument>,
    @InjectModel(AppraisalRecord.name) private recordModel: Model<AppraisalRecordDocument>,
    @InjectModel(AppraisalDispute.name) private disputeModel: Model<AppraisalDisputeDocument>,
    @InjectModel(EmployeeProfile.name) private employeeModel: Model<EmployeeProfileDocument>,
    @InjectModel(Department.name) private departmentModel: Model<DepartmentDocument>,
    @InjectModel(Position.name) private positionModel: Model<PositionDocument>,
  ) {}

  /* =========================================================
      Templates (REQ-PP-01) – NO CHANGES
     ========================================================= */
  async createTemplate(dto: CreateTemplateDto) {
    if (!dto.applicableDepartmentIds?.length) throw new BadRequestException('At least one department must be selected');
    if (!dto.applicablePositionIds?.length) throw new BadRequestException('At least one position must be selected');
    if (dto.name) {
      const existing = await this.templateModel.findOne({ name: dto.name });
      if (existing) throw new ConflictException(`Template name "${dto.name}" already exists`);
    }
    for (const depId of dto.applicableDepartmentIds) {
      const dep = await this.departmentModel.findById(depId);
      if (!dep) throw new BadRequestException(`Department ${depId} does not exist`);
    }
    for (const posId of dto.applicablePositionIds) {
      const pos = await this.positionModel.findById(posId);
      if (!pos) throw new BadRequestException(`Position ${posId} does not exist`);
    }
    const template = new this.templateModel(dto);
    return template.save();
  }

  async listTemplates(query: any) {
    const templates = await this.templateModel.find(query).exec();
    return templates.length ? templates : { message: 'No templates found' };
  }

  async getTemplateById(id: string) {
    const template = await this.templateModel.findById(id);
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async updateTemplate(id: string, updates: Partial<CreateTemplateDto>) {
    const template = await this.templateModel.findById(id);
    if (!template) throw new NotFoundException('Template not found');
    if (updates.name) {
      const other = await this.templateModel.findOne({ name: updates.name, _id: { $ne: id } });
      if (other) throw new ConflictException(`Template name "${updates.name}" already in use`);
    }
    const usedInActive = await this.cycleModel.findOne({
      'templateAssignments.templateId': id,
      status: AppraisalCycleStatus.ACTIVE,
    });
    if (usedInActive) throw new ConflictException('Cannot modify template used in an active cycle');
    if (updates.applicableDepartmentIds) {
      for (const depId of updates.applicableDepartmentIds) {
        const dep = await this.departmentModel.findById(depId);
        if (!dep) throw new BadRequestException(`Department ${depId} does not exist`);
      }
    }
    if (updates.applicablePositionIds) {
      for (const posId of updates.applicablePositionIds) {
        const pos = await this.positionModel.findById(posId);
        if (!pos) throw new BadRequestException(`Position ${posId} does not exist`);
      }
    }
    Object.assign(template, updates);
    return template.save();
  }

  async deactivateTemplate(id: string) {
    const template = await this.templateModel.findById(id);
    if (!template) throw new NotFoundException('Template not found');
    if (!template.isActive) throw new ConflictException('Template already deactivated');
    const usedInActive = await this.cycleModel.findOne({
      'templateAssignments.templateId': id,
      status: AppraisalCycleStatus.ACTIVE,
    });
    if (usedInActive) throw new ConflictException('Cannot deactivate template used in an active cycle');
    template.isActive = false;
    return template.save();
  }

  /* =========================================================
      Cycles (REQ-PP-02) – NO CHANGES
     ========================================================= */
  async createCycle(dto: CreateCycleDto) {
    for (const ta of dto.templateAssignments) {
      const template = await this.templateModel.findById(ta.templateId);
      if (!template) throw new BadRequestException(`Template ${ta.templateId} not found`);
      for (const depId of ta.departmentIds) {
        const dep = await this.departmentModel.findById(depId);
        if (!dep) throw new BadRequestException(`Department ${depId} not found`);
      }
    }
    if (dto.startDate && dto.endDate) {
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new BadRequestException('Invalid dates');
      if (start >= end) throw new BadRequestException('startDate must be before endDate');
    }
    for (const ta of dto.templateAssignments) {
      for (const depId of ta.departmentIds) {
        const overlapping = await this.cycleModel.findOne({
          'templateAssignments.departmentIds': depId,
          $or: [
            { startDate: { $lte: new Date(dto.endDate) }, endDate: { $gte: new Date(dto.startDate) } },
            { status: AppraisalCycleStatus.ACTIVE },
          ],
        });
        if (overlapping) throw new ConflictException(`Overlapping cycle for department ${depId}`);
      }
    }
    const cycle = new this.cycleModel({ ...dto, status: AppraisalCycleStatus.PLANNED });
    return cycle.save();
  }

  async activateCycle(id: string) {
    const cycle = await this.cycleModel.findById(id);
    if (!cycle) throw new NotFoundException('Cycle not found');
    if (cycle.status !== AppraisalCycleStatus.PLANNED) throw new ConflictException('Only planned cycles can be activated');
    if (!cycle.templateAssignments?.length) throw new BadRequestException('Cycle has no template assignments');
    cycle.status = AppraisalCycleStatus.ACTIVE;
    return cycle.save();
  }

  async closeCycle(id: string) {
    const cycle = await this.cycleModel.findById(id);
    if (!cycle) throw new NotFoundException('Cycle not found');
    if (cycle.status !== AppraisalCycleStatus.ACTIVE) throw new ConflictException('Only active cycles can be closed');
    cycle.status = AppraisalCycleStatus.CLOSED;
    cycle.closedAt = new Date();
    return cycle.save();
  }

  async listCycles(query: any) {
    return this.cycleModel.find(query).exec();
  }

  async getCycleById(id: string) {
    const cycle = await this.cycleModel.findById(id);
    if (!cycle) throw new NotFoundException('Cycle not found');
    return cycle;
  }

  /* =========================================================
      Assignments (REQ-PP-05, REQ-PP-13) – NO CHANGES
     ========================================================= */
  async bulkAssign(dto: BulkAssignDto) {
    if (!dto.assignments?.length) throw new BadRequestException('No assignments provided');
    const prepared: Partial<CreateAssignmentDto>[] = [];
    for (const a of dto.assignments) {
      const [cycle, emp, dep] = await Promise.all([
        this.cycleModel.findById(a.cycleId),
        this.employeeModel.findById(a.employeeProfileId),
        this.departmentModel.findById(a.departmentId),
      ]);
      if (!cycle) throw new BadRequestException(`Cycle ${a.cycleId} not found`);
      if (!emp) throw new BadRequestException(`Employee ${a.employeeProfileId} not found`);
      if (!dep) throw new BadRequestException(`Department ${a.departmentId} not found`);
      if (a.managerProfileId) {
        const mgr = await this.employeeModel.findById(a.managerProfileId);
        if (!mgr) throw new BadRequestException(`Manager ${a.managerProfileId} not found`);
      }
      if (a.positionId) {
        const pos = await this.positionModel.findById(a.positionId);
        if (!pos) throw new BadRequestException(`Position ${a.positionId} not found`);
      }
      const empDeptId = (emp as any).departmentId?.toString?.();
      if (empDeptId && empDeptId !== a.departmentId.toString()) {
        throw new ConflictException(`Employee does not belong to department`);
      }
      const template = await this.templateModel.findById(a.templateId);
      if (!template) throw new BadRequestException(`Template ${a.templateId} not found`);
      if (Array.isArray((template as any).applicableDepartmentIds) && (template as any).applicableDepartmentIds.length) {
        const tplDeps = (template as any).applicableDepartmentIds.map((d: any) =>
          Types.ObjectId.isValid(d) ? new Types.ObjectId(d).toString() : d.toString(),
        );
        if (!tplDeps.includes(a.departmentId.toString()))
          throw new ConflictException(`Template not applicable to department`);
      }
      if (Array.isArray((template as any).applicablePositionIds) && (template as any).applicablePositionIds.length && a.positionId) {
        const tplPos = (template as any).applicablePositionIds.map((p: any) =>
          Types.ObjectId.isValid(p) ? new Types.ObjectId(p).toString() : p.toString(),
        );
        if (!tplPos.includes(a.positionId.toString()))
          throw new ConflictException(`Template not applicable to position`);
      }
      const existing = await this.assignmentModel.findOne({
        employeeProfileId: a.employeeProfileId,
        cycleId: a.cycleId,
        templateId: a.templateId,
      });
      if (existing) throw new ConflictException('Assignment already exists for employee in cycle');
      prepared.push({ ...a, status: a.status || AppraisalAssignmentStatus.NOT_STARTED });
    }
    return this.assignmentModel.insertMany(prepared);
  }

  /*  USER-SCOPED  */
async getAssignmentsForManager(managerId: string, user?: AuthUser) {
  if (user && !['HR_MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'].includes(user.role)) {
    if (user.employeeId !== (managerId as string)) throw new ForbiddenException('You can only view your own assignments');
  }
  const manager = await this.employeeModel.findById(managerId);
  if (!manager) throw new NotFoundException(`Manager ${managerId} not found`);
  return this.assignmentModel
    .find({ managerProfileId: managerId })
    .populate('cycleId templateId employeeProfileId departmentId positionId')
    .exec();
}

  /*  USER-SCOPED  */
async getAssignmentsForEmployee(employeeId: string, user?: AuthUser) {
  if (user && !['HR_MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'].includes(user.role)) {
    if (user.employeeId !== (employeeId as string)) throw new ForbiddenException('You can only view your own assignments');
  }
  const emp = await this.employeeModel.findById(employeeId);
  if (!emp) throw new NotFoundException(`Employee ${employeeId} not found`);
  const assignments = await this.assignmentModel
    .find({ employeeProfileId: employeeId })
    .populate('cycleId templateId managerProfileId departmentId positionId')
    .exec();
  return assignments.length ? assignments : [];
}

  async getAssignmentById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid assignment ID: ${id}`);
    const assignment = await this.assignmentModel
      .findById(id)
      .populate('cycleId templateId employeeProfileId managerProfileId departmentId positionId')
      .exec();
    if (!assignment) throw new NotFoundException(`Assignment ${id} not found`);
    return assignment;
  }

  /* =========================================================
      Records (REQ-AE-03, REQ-AE-04) – USER-SCOPED where noted
     ========================================================= */
  async submitRecord(dto: SubmitRecordDto, user?: AuthUser) {
if (user && !['HR_MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'].includes(user.role)) {
  if (user.employeeId !== (dto.managerProfileId as unknown as string)) throw new ForbiddenException('You can only submit for your own assignments');
}
    const assignment = await this.assignmentModel.findById(dto.assignmentId);
    if (!assignment) throw new BadRequestException('Assignment not found');
    if (![AppraisalAssignmentStatus.NOT_STARTED, AppraisalAssignmentStatus.IN_PROGRESS].includes(assignment.status)) {
      throw new ConflictException('Cannot submit record for an assignment not in progress');
    }
    if (!dto.ratings?.length) throw new BadRequestException('Ratings must be provided');
    let template: any = null;
    if (assignment.templateId) template = await this.templateModel.findById(assignment.templateId);
    const ratingScale = template?.ratingScale;
    let totalScore = 0;
    for (const r of dto.ratings) {
      if (r.ratingValue == null && r.weightedScore == null) throw new BadRequestException('Each rating must contain ratingValue or weightedScore');
      const value = r.weightedScore ?? r.ratingValue;
      if (ratingScale) {
        const min = ratingScale.min ?? null;
        const max = ratingScale.max ?? null;
        if (min != null && value < min) throw new BadRequestException(`Rating ${value} below minimum ${min}`);
        if (max != null && value > max) throw new BadRequestException(`Rating ${value} above maximum ${max}`);
      }
      totalScore += value;
    }
    const record = new this.recordModel({ ...dto, totalScore, status: AppraisalRecordStatus.MANAGER_SUBMITTED, managerSubmittedAt: new Date() });
    const saved = await record.save();
    assignment.status = AppraisalAssignmentStatus.SUBMITTED;
    assignment.submittedAt = new Date();
    assignment.latestAppraisalId = saved._id;
    await assignment.save();
    return saved;
  }

  async getRecordById(id: string) {
    const record = await this.recordModel.findById(id).populate('assignmentId cycleId templateId employeeProfileId managerProfileId');
    if (!record) throw new NotFoundException('Record not found');
    return record;
  }

async publishRecord(id: string, hrPublishedById?: string) {
  const record = await this.recordModel.findById(id);
  if (!record) throw new NotFoundException('Record not found');
  if (record.status !== AppraisalRecordStatus.MANAGER_SUBMITTED) throw new ConflictException('Only manager-submitted records can be published');
  if (record.hrPublishedAt) throw new ConflictException('Record already published');
  const cycle = await this.cycleModel.findById(record.cycleId);
  if (cycle?.status === AppraisalCycleStatus.CLOSED) throw new ConflictException('Cannot publish for a closed cycle');
  if (hrPublishedById) {
    const hrUser = await this.employeeModel.findById(new Types.ObjectId(hrPublishedById));
    if (!hrUser) throw new BadRequestException('hrPublishedById is not a valid employee');
  }
  record.status = AppraisalRecordStatus.HR_PUBLISHED;
  record.hrPublishedAt = new Date();
  record.publishedByEmployeeId = hrPublishedById ? new Types.ObjectId(hrPublishedById) : undefined; // ← cast
  await this.employeeModel.findByIdAndUpdate(record.employeeProfileId, {
    $push: {
      appraisalHistory: {
        appraisalDate: record.hrPublishedAt,
        cycleId: record.cycleId,
        templateId: record.templateId,
        totalScore: record.totalScore,
        overallRatingLabel: record.overallRatingLabel,
        recordId: record._id,
      },
    },
  });
  const assignment = await this.assignmentModel.findById(record.assignmentId);
  if (assignment) {
    assignment.status = AppraisalAssignmentStatus.PUBLISHED;
    assignment.publishedAt = new Date();
    await assignment.save();
  }
  return record.save();
}
  /*  USER-SCOPED  */
  async acknowledgeRecord(id: string, employeeId: string, comment?: string, user?: AuthUser) {
    if (user && !['HR_MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'].includes(user.role)) {
      if (user.employeeId !== employeeId) throw new ForbiddenException('You can only acknowledge your own appraisal');
    }
    const record = await this.recordModel.findById(id);
    if (!record) throw new NotFoundException('Record not found');
    if (record.status !== AppraisalRecordStatus.HR_PUBLISHED) throw new ConflictException('Cannot acknowledge a record not published by HR');
    const empObjId = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;
    if (record.employeeProfileId.toString() !== empObjId.toString()) throw new BadRequestException('Employee cannot acknowledge another employee record');
    const activeDispute = await this.disputeModel.findOne({
      appraisalId: record._id,
      status: { $in: [AppraisalDisputeStatus.OPEN, AppraisalDisputeStatus.UNDER_REVIEW] },
    });
    if (activeDispute) throw new ConflictException('Cannot acknowledge while active dispute exists');
    record.employeeAcknowledgedAt = new Date();
    record.employeeAcknowledgementComment = comment;
    const assignment = await this.assignmentModel.findById(record.assignmentId);
    if (assignment) {
      assignment.status = AppraisalAssignmentStatus.ACKNOWLEDGED;
      await assignment.save();
    }
    return record.save();
  }

  /* =========================================================
      Disputes (REQ-AE-07, REQ-OD-07) – USER-SCOPED where noted
     ========================================================= */
  async raiseDispute(dto: RaiseDisputeDto, user?: AuthUser) {
if (user && !['HR_MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'].includes(user.role)) {
  if (user.employeeId !== (dto.raisedByEmployeeId as unknown as string)) throw new ForbiddenException('You can only dispute your own appraisal');
}
    const record = await this.recordModel.findById(dto.appraisalId);
    if (!record) throw new BadRequestException('Appraisal record not found');
    const assignment = await this.assignmentModel.findById(dto.assignmentId);
    if (!assignment) throw new BadRequestException('Assignment not found');
    const cycle = await this.cycleModel.findById(dto.cycleId);
    if (!cycle) throw new BadRequestException('Cycle not found');
    if (!record.hrPublishedAt) throw new BadRequestException('Cannot dispute unpublished record');
    if (record.employeeAcknowledgedAt) throw new ConflictException('Cannot raise dispute after employee has acknowledged the record');
    const daysSincePublish = Math.floor((Date.now() - record.hrPublishedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSincePublish > 7) throw new BadRequestException('Dispute window has closed. Appeals must be filed within 7 days of publication.');
    const existingDispute = await this.disputeModel.findOne({
      appraisalId: dto.appraisalId,
      status: { $in: [AppraisalDisputeStatus.OPEN, AppraisalDisputeStatus.UNDER_REVIEW] },
    });
    if (existingDispute) throw new ConflictException('An active dispute already exists for this appraisal');
    if (!dto.reason?.trim()) throw new BadRequestException('Dispute reason is required');
    const dispute = new this.disputeModel({ ...dto, status: AppraisalDisputeStatus.OPEN, submittedAt: new Date() });
    return dispute.save();
  }

  async resolveDispute(id: string, dto: ResolveDisputeDto) {
    const dispute = await this.disputeModel.findById(id);
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (![AppraisalDisputeStatus.OPEN, AppraisalDisputeStatus.UNDER_REVIEW].includes(dispute.status))
      throw new ConflictException('Only open or under-review disputes can be resolved');
    dispute.status = dto.status;
    dispute.resolutionSummary = dto.resolutionSummary;
    dispute.resolvedByEmployeeId = dto.resolvedBy;
    dispute.resolvedAt = new Date();
    return dispute.save();
  }

  async getDisputeById(id: string) {
    const dispute = await this.disputeModel
      .findById(id)
      .populate('appraisalId assignmentId cycleId raisedByEmployeeId resolvedByEmployeeId');
    if (!dispute) throw new NotFoundException('Dispute not found');
    return dispute;
  }

  async listDisputes(query: any) {
    const disputes = await this.disputeModel.find(query).populate('appraisalId raisedByEmployeeId resolvedByEmployeeId').exec();
    if (!disputes.length) throw new NotFoundException('No disputes found');
    return disputes;
  }

  /* =========================================================
      Reminders / Reports / Dashboard – USER-SCOPED where noted
     ========================================================= */
  async sendPendingReminders(cycleId: string) {
    const cycle = await this.cycleModel.findById(cycleId);
    if (!cycle) throw new NotFoundException('Cycle not found');
    const pendingAssignments = await this.assignmentModel
      .find({ cycleId, status: { $in: [AppraisalAssignmentStatus.NOT_STARTED, AppraisalAssignmentStatus.IN_PROGRESS] } })
      .populate('managerProfileId employeeProfileId');
    return pendingAssignments.map((a) => ({
      assignmentId: a._id,
      managerId: a.managerProfileId,
      employeeId: a.employeeProfileId,
      status: a.status,
      dueDate: a.dueDate,
    }));
  }

  async getEmployeeAppraisalHistory(employeeId: string, limit?: number, user?: AuthUser) {
    if (user && !['HR_MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'].includes(user.role)) {
      if (user.employeeId !== employeeId) throw new ForbiddenException('You can only view your own history');
    }
    const query = this.recordModel
      .find({ employeeProfileId: employeeId, status: AppraisalRecordStatus.HR_PUBLISHED })
      .sort({ hrPublishedAt: -1 })
      .populate('cycleId templateId managerProfileId');
    if (limit) query.limit(limit);
    return query.exec();
  }

  async getEmployeeAppraisalTrends(employeeId: string, user?: AuthUser) {
    if (user && !['HR_MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'].includes(user.role)) {
      if (user.employeeId !== employeeId) throw new ForbiddenException('You can only view your own trends');
    }
    const history = await this.getEmployeeAppraisalHistory(employeeId, undefined, user);
    const trends = history.map((r) => ({
      date: r.hrPublishedAt,
      cycleName: (r.cycleId as any)?.name,
      totalScore: r.totalScore,
      overallRating: r.overallRatingLabel,
      templateType: (r.templateId as any)?.templateType,
    }));
    return {
      employeeId,
      totalAppraisals: trends.length,
      trends,
      averageScore: trends.length ? trends.reduce((s, t) => s + (t.totalScore || 0), 0) / trends.length : 0,
    };
  }

  async generateCycleReport(cycleId: string) {
    const cycle = await this.cycleModel.findById(cycleId);
    if (!cycle) throw new NotFoundException('Cycle not found');
    const assignments = await this.assignmentModel.find({ cycleId }).populate('employeeProfileId managerProfileId departmentId templateId');
    const assignmentIds = assignments.map((a) => a._id);
    const records = await this.recordModel.find({ assignmentId: { $in: assignmentIds } }).populate('employeeProfileId managerProfileId');
    const disputes = await this.disputeModel.find({ cycleId }).populate('raisedByEmployeeId resolvedByEmployeeId');
    const stats = {
      totalAssignments: assignments.length,
      completedRecords: records.filter((r) => r.status === AppraisalRecordStatus.HR_PUBLISHED).length,
      pendingSubmissions: assignments.filter((a) => [AppraisalAssignmentStatus.NOT_STARTED, AppraisalAssignmentStatus.IN_PROGRESS].includes(a.status)).length,
      totalDisputes: disputes.length,
      openDisputes: disputes.filter((d) => d.status === AppraisalDisputeStatus.OPEN).length,
    };
    return { cycle, stats, assignments, records, disputes };
  }

  async generateDepartmentReport(departmentId: string, cycleId?: string) {
    const department = await this.departmentModel.findById(departmentId);
    if (!department) throw new NotFoundException('Department not found');
    const query: any = { departmentId };
    if (cycleId) query.cycleId = cycleId;
    const assignments = await this.assignmentModel.find(query).populate('employeeProfileId managerProfileId cycleId templateId');
    const assignmentIds = assignments.map((a) => a._id);
    const records = await this.recordModel.find({ assignmentId: { $in: assignmentIds } }).populate('employeeProfileId');
    const completed = records.filter((r) => r.status === AppraisalRecordStatus.HR_PUBLISHED).length;
    const completionRate = assignments.length ? (completed / assignments.length) * 100 : 0;
    const averageScore = records.length ? records.reduce((sum, r) => sum + (r.totalScore || 0), 0) / records.length : 0;
    return {
      department: { id: department._id, name: department.name },
      stats: {
        totalEmployees: assignments.length,
        completedAppraisals: completed,
        completionRate: Math.round(completionRate * 100) / 100,
        averageScore: Math.round(averageScore * 100) / 100,
      },
      assignments,
      records,
    };
  }

  async exportAllRecords(cycleId?: string, format: 'json' | 'csv' = 'json') {
    const query: any = {};
    if (cycleId) query.cycleId = cycleId;
    const records = await this.recordModel.find(query).populate('cycleId templateId employeeProfileId managerProfileId').exec();
    if (format === 'csv') {
      return records.map((r) => ({
        RecordId: r._id,
        EmployeeName: `${(r.employeeProfileId as any)?.firstName} ${(r.employeeProfileId as any)?.lastName}`,
        ManagerName: `${(r.managerProfileId as any)?.firstName} ${(r.managerProfileId as any)?.lastName}`,
        CycleName: (r.cycleId as any)?.name,
        TemplateName: (r.templateId as any)?.name,
        TotalScore: r.totalScore,
        OverallRating: r.overallRatingLabel,
        Status: r.status,
        SubmittedDate: r.managerSubmittedAt,
        PublishedDate: r.hrPublishedAt,
      }));
    }
    return { format: 'json', data: records };
  }

  async dashboardStats(departmentId?: string) {
    const query: any = {};
    if (departmentId) query.departmentId = departmentId;
    const [totalCycles, activeCycles, totalAssignments, submittedRecords, publishedRecords, openDisputes] = await Promise.all([
      this.cycleModel.countDocuments(),
      this.cycleModel.countDocuments({ status: AppraisalCycleStatus.ACTIVE }),
      this.assignmentModel.countDocuments(query),
      this.recordModel.countDocuments({ ...query, status: AppraisalRecordStatus.MANAGER_SUBMITTED }),
      this.recordModel.countDocuments({ ...query, status: AppraisalRecordStatus.HR_PUBLISHED }),
      this.disputeModel.countDocuments({ status: AppraisalDisputeStatus.OPEN }),
    ]);
    return {
      totalCycles,
      activeCycles,
      totalAssignments,
      submittedRecords,
      publishedRecords,
      openDisputes,
      completionRate: totalAssignments ? (publishedRecords / totalAssignments) * 100 : 0,
    };
  }

  async getDepartmentProgress(cycleId?: string) {
    const query: any = {};
    if (cycleId) query.cycleId = cycleId;
    const assignments = await this.assignmentModel.find(query).populate('departmentId');
    const departmentMap = new Map<string, any>();
    for (const assignment of assignments) {
      const deptId = assignment.departmentId.toString();
      const deptName = (assignment.departmentId as any).name;
      if (!departmentMap.has(deptId)) {
        departmentMap.set(deptId, {
          departmentId: deptId,
          departmentName: deptName,
          total: 0,
          notStarted: 0,
          inProgress: 0,
          submitted: 0,
          published: 0,
          acknowledged: 0,
          completionRate: 0,
        });
      }
      const dept = departmentMap.get(deptId);
      dept.total++;
      switch (assignment.status) {
        case AppraisalAssignmentStatus.NOT_STARTED:
          dept.notStarted++;
          break;
        case AppraisalAssignmentStatus.IN_PROGRESS:
          dept.inProgress++;
          break;
        case AppraisalAssignmentStatus.SUBMITTED:
          dept.submitted++;
          break;
        case AppraisalAssignmentStatus.PUBLISHED:
          dept.published++;
          break;
        case AppraisalAssignmentStatus.ACKNOWLEDGED:
          dept.acknowledged++;
          break;
      }
      dept.completionRate = dept.total > 0 ? ((dept.published + dept.acknowledged) / dept.total) * 100 : 0;
    }
    return Array.from(departmentMap.values()).sort((a, b) => a.completionRate - b.completionRate);
  }
}