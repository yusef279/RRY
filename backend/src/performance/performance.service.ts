// performance.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
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
  ResolveDisputeDto
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
  AppraisalDisputeStatus
} from './enums/performance.enums';

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
    @InjectModel(Position.name) private positionModel: Model<PositionDocument>
  ) {}

  // =============================
  // Templates (REQ-PP-01)
  // =============================
  async createTemplate(dto: CreateTemplateDto) {
    if (!dto.applicableDepartmentIds?.length) {
      throw new BadRequestException('At least one department must be selected');
    }
    if (!dto.applicablePositionIds?.length) {
      throw new BadRequestException('At least one position must be selected');
    }

    // Name uniqueness
    if (dto.name) {
      const existingByName = await this.templateModel.findOne({ name: dto.name });
      if (existingByName) throw new ConflictException(`Template with name "${dto.name}" already exists`);
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
    if (!templates.length) {
      return { message: 'No templates found' };
    }
    return templates;
  }

  async getTemplateById(id: string) {
    const template = await this.templateModel.findById(id);
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async updateTemplate(id: string, updates: Partial<CreateTemplateDto>) {
    const template = await this.templateModel.findById(id);
    if (!template) throw new NotFoundException('Template not found');

    // Prevent editing name to a duplicate
    if (updates.name) {
      const other = await this.templateModel.findOne({ name: updates.name, _id: { $ne: id } });
      if (other) throw new ConflictException(`Template name "${updates.name}" already in use`);
    }

    // Prevent updating a template that is used by an active cycle
    const usedInActiveCycle = await this.cycleModel.findOne({
      'templateAssignments.templateId': id,
      status: AppraisalCycleStatus.ACTIVE
    });
    if (usedInActiveCycle) {
      throw new ConflictException('Cannot modify template while it is used in an active cycle');
    }

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

    // Prevent deactivation if used in active cycles
    const usedInActiveCycle = await this.cycleModel.findOne({
      'templateAssignments.templateId': id,
      status: AppraisalCycleStatus.ACTIVE
    });
    if (usedInActiveCycle) {
      throw new ConflictException('Cannot deactivate template while it is used in an active cycle');
    }

    template.isActive = false;
    return template.save();
  }

  // =============================
  // Cycles (REQ-PP-02)
  // =============================
  async createCycle(dto: CreateCycleDto) {
    // Validate template assignments and departments
    for (const assignment of dto.templateAssignments) {
      const template = await this.templateModel.findById(assignment.templateId);
      if (!template) throw new BadRequestException(`Template ${assignment.templateId} not found`);

      if (!assignment.departmentIds?.length) {
        throw new BadRequestException('Each template assignment must include at least one departmentId');
      }

      for (const depId of assignment.departmentIds) {
        const dep = await this.departmentModel.findById(depId);
        if (!dep) throw new BadRequestException(`Department ${depId} not found`);
      }
    }

    // Validate cycle dates
    if (dto.startDate && dto.endDate) {
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException('Invalid startDate or endDate');
      }
      if (start >= end) throw new BadRequestException('cycle startDate must be before endDate');
    }

    // Prevent overlapping cycles for same departments (simple check)
    for (const ta of dto.templateAssignments) {
      for (const depId of ta.departmentIds) {
        const overlapping = await this.cycleModel.findOne({
          'templateAssignments.departmentIds': depId,
          $or: [
            {
              startDate: { $lte: new Date(dto.endDate) },
              endDate: { $gte: new Date(dto.startDate) }
            },
            { status: AppraisalCycleStatus.ACTIVE }
          ]
        });
        if (overlapping) {
          throw new ConflictException(`Overlapping cycle found for department ${depId}`);
        }
      }
    }

    const cycle = new this.cycleModel({ ...dto, status: AppraisalCycleStatus.PLANNED });
    return cycle.save();
  }

  async activateCycle(id: string) {
    const cycle = await this.cycleModel.findById(id);
    if (!cycle) throw new NotFoundException('Cycle not found');
    if (cycle.status !== AppraisalCycleStatus.PLANNED) throw new ConflictException('Only planned cycles can be activated');

    // Optional: ensure cycle has templateAssignments or assignments exist
    if (!cycle.templateAssignments || !cycle.templateAssignments.length) {
      throw new BadRequestException('Cycle has no template assignments configured');
    }

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

  // =============================
  // Assignments (REQ-PP-05, REQ-PP-13)
  // =============================
  async bulkAssign(dto: BulkAssignDto) {
    if (!dto.assignments?.length) throw new BadRequestException('No assignments provided');

    const prepared: Partial<CreateAssignmentDto>[] = [];
    for (const assignment of dto.assignments) {
      // Validate cycle exists
      const cycle = await this.cycleModel.findById(assignment.cycleId);
      if (!cycle) throw new BadRequestException(`Cycle ${assignment.cycleId} not found`);

      const employee = await this.employeeModel.findById(assignment.employeeProfileId);
      if (!employee) throw new BadRequestException(`Employee ${assignment.employeeProfileId} not found`);

      const department = await this.departmentModel.findById(assignment.departmentId);
      if (!department) throw new BadRequestException(`Department ${assignment.departmentId} not found`);

      if (assignment.managerProfileId) {
        const manager = await this.employeeModel.findById(assignment.managerProfileId);
        if (!manager) throw new BadRequestException(`Manager ${assignment.managerProfileId} not found`);
      }

      if (assignment.positionId) {
        const position = await this.positionModel.findById(assignment.positionId);
        if (!position) throw new BadRequestException(`Position ${assignment.positionId} not found`);
      }

      // Ensure employee is actually in this department (if your schema has department info)
      if ((employee as any).departmentId && (employee as any).departmentId.toString() !== assignment.departmentId.toString()) {
        // Depending on business rules, you might allow assignment to other departments. For safety, block it here.
        throw new ConflictException(`Employee ${assignment.employeeProfileId} does not belong to department ${assignment.departmentId}`);
      }

      // Validate template exists and is applicable to department/position
      const template = await this.templateModel.findById(assignment.templateId);
      if (!template) throw new BadRequestException(`Template ${assignment.templateId} not found`);

      // Template applicability checks (if template defines applicableDepartmentIds/applicablePositionIds)
      if (Array.isArray((template as any).applicableDepartmentIds) && (template as any).applicableDepartmentIds.length) {
        if (!(template as any).applicableDepartmentIds.map((d: any) => d.toString()).includes(assignment.departmentId.toString())) {
          throw new ConflictException(`Template ${assignment.templateId} is not applicable to department ${assignment.departmentId}`);
        }
      }

      if (Array.isArray((template as any).applicablePositionIds) && (template as any).applicablePositionIds.length && assignment.positionId) {
        if (!(template as any).applicablePositionIds.map((p: any) => p.toString()).includes(assignment.positionId.toString())) {
          throw new ConflictException(`Template ${assignment.templateId} is not applicable to position ${assignment.positionId}`);
        }
      }

      // Logical check: Prevent duplicate assignment
      const existing = await this.assignmentModel.findOne({
        employeeProfileId: assignment.employeeProfileId,
        cycleId: assignment.cycleId,
        templateId: assignment.templateId
      });
      if (existing) throw new ConflictException('Assignment already exists for this employee in this cycle');

      prepared.push({
        ...assignment,
        status: assignment.status || AppraisalAssignmentStatus.NOT_STARTED
      });
    }

    return this.assignmentModel.insertMany(prepared);
  }

  async getAssignmentsForManager(managerId: string) {
    const manager = await this.employeeModel.findById(managerId);
    if (!manager) throw new NotFoundException(`Manager ${managerId} not found`);

    const assignments = await this.assignmentModel
      .find({ managerProfileId: managerId })
      .populate('cycleId templateId employeeProfileId departmentId positionId')
      .exec();

    if (!assignments.length) {
      // return empty array for UX instead of throwing for missing assignments
      return [];
    }

    return assignments;
  }

  async getAssignmentsForEmployee(employeeId: string) {
    const employee = await this.employeeModel.findById(employeeId);
    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

    const assignments = await this.assignmentModel
      .find({ employeeProfileId: employeeId })
      .populate('cycleId templateId managerProfileId departmentId positionId')
      .exec();

    if (!assignments.length) {
      return [];
    }

    return assignments;
  }

  async getAssignmentById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid assignment ID: ${id}`);
    }

    const assignment = await this.assignmentModel
      .findById(id)
      .populate('cycleId templateId employeeProfileId managerProfileId departmentId positionId')
      .exec();

    if (!assignment) throw new NotFoundException(`Assignment with id ${id} not found`);

    return assignment;
  }

  // =============================
  // Records (REQ-AE-03, REQ-AE-04)
  // =============================
  async submitRecord(dto: SubmitRecordDto) {
    const assignment = await this.assignmentModel.findById(dto.assignmentId);
    if (!assignment) throw new BadRequestException('Assignment not found');
    if (![AppraisalAssignmentStatus.NOT_STARTED, AppraisalAssignmentStatus.IN_PROGRESS].includes(assignment.status)) {
      throw new ConflictException('Cannot submit record for an assignment not in progress');
    }

    // Validate ratings presence & template constraints
    if (!dto.ratings || !dto.ratings.length) {
      throw new BadRequestException('Ratings must be provided for submission');
    }

    // If assignment has templateId, validate rating items against template rating definitions if possible
    let template: any = null;
    if (assignment.templateId) {
      template = await this.templateModel.findById(assignment.templateId);
    }

    // If the template contains a ratingScale definition, attempt to validate rating values
    // (This assumes your template has something like ratingScale.min and ratingScale.max or scale items)
    const ratingScale = template?.ratingScale;
    let totalScore = 0;

    for (const rating of dto.ratings) {
      if (rating.ratingValue == null && rating.weightedScore == null) {
        throw new BadRequestException('Each rating must contain a ratingValue or weightedScore');
      }

      const value = rating.weightedScore ?? rating.ratingValue;
      if (ratingScale) {
        const min = ratingScale.min ?? null;
        const max = ratingScale.max ?? null;
        if (min != null && value < min) {
          throw new BadRequestException(`Rating value ${value} is below allowed minimum ${min}`);
        }
        if (max != null && value > max) {
          throw new BadRequestException(`Rating value ${value} is above allowed maximum ${max}`);
        }
      }

      totalScore += value;
    }

    const record = new this.recordModel({
      ...dto,
      totalScore,
      status: AppraisalRecordStatus.MANAGER_SUBMITTED,
      managerSubmittedAt: new Date()
    });

    const savedRecord = await record.save();

    assignment.status = AppraisalAssignmentStatus.SUBMITTED;
    assignment.submittedAt = new Date();
    assignment.latestAppraisalId = savedRecord._id;
    await assignment.save();

    return savedRecord;
  }

  async publishRecord(id: string, hrPublishedById?: Types.ObjectId) {
    const record = await this.recordModel.findById(id);
    if (!record) throw new NotFoundException('Record not found');
    if (record.status !== AppraisalRecordStatus.MANAGER_SUBMITTED) {
      throw new ConflictException('Only manager-submitted records can be published');
    }

    // Prevent double publish
    if (record.hrPublishedAt) {
      throw new ConflictException('Record already published by HR');
    }

    // Check cycle status - cannot publish if cycle is closed
    const cycle = await this.cycleModel.findById(record.cycleId);
    if (cycle && cycle.status === AppraisalCycleStatus.CLOSED) {
      throw new ConflictException('Cannot publish record for a closed cycle');
    }

    // Validate HR publisher exists (role check should be enforced via auth layer)
    if (hrPublishedById) {
      const hrUser = await this.employeeModel.findById(hrPublishedById);
      if (!hrUser) throw new BadRequestException('hrPublishedById is not a valid employee');
      // OPTIONAL: enforce role: if (!hrUser.roles.includes('HR')) throw new BadRequestException('User is not authorized as HR');
    }

    record.status = AppraisalRecordStatus.HR_PUBLISHED;
    record.hrPublishedAt = new Date();
    record.publishedByEmployeeId = hrPublishedById;

    await this.employeeModel.findByIdAndUpdate(
      record.employeeProfileId,
      {
        $push: {
          appraisalHistory: {
            appraisalDate: record.hrPublishedAt,
            cycleId: record.cycleId,
            templateId: record.templateId,
            totalScore: record.totalScore,
            overallRatingLabel: record.overallRatingLabel,
            recordId: record._id
          }
        }
      }
    );

    const assignment = await this.assignmentModel.findById(record.assignmentId);
    if (assignment) {
      assignment.status = AppraisalAssignmentStatus.PUBLISHED;
      assignment.publishedAt = new Date();
      await assignment.save();
    }

    return record.save();
  }

  async acknowledgeRecord(id: string, employeeId: Types.ObjectId | string, comment?: string) {
    const record = await this.recordModel.findById(id);
    if (!record) throw new NotFoundException('Record not found');
    if (record.status !== AppraisalRecordStatus.HR_PUBLISHED) throw new ConflictException('Cannot acknowledge a record not published by HR');

    const empId = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;
    if (record.employeeProfileId.toString() !== empId.toString()) {
      throw new BadRequestException('Employee cannot acknowledge another employee\'s record');
    }

    // Prevent acknowledgement when there is an active dispute
    const activeDispute = await this.disputeModel.findOne({
      appraisalId: record._id,
      status: { $in: [AppraisalDisputeStatus.OPEN, AppraisalDisputeStatus.UNDER_REVIEW] }
    });
    if (activeDispute) {
      throw new ConflictException('Cannot acknowledge record while an active dispute exists');
    }

    record.employeeAcknowledgedAt = new Date();
    record.employeeAcknowledgementComment = comment;

    const assignment = await this.assignmentModel.findById(record.assignmentId);
    if (assignment) {
      assignment.status = AppraisalAssignmentStatus.ACKNOWLEDGED;
      await assignment.save();
    }

    return record.save();
  }

  async getRecordById(id: string) {
    const record = await this.recordModel
      .findById(id)
      .populate('assignmentId cycleId templateId employeeProfileId managerProfileId');
    if (!record) throw new NotFoundException('Record not found');
    return record;
  }

  // =============================
  // Disputes (REQ-AE-07, REQ-OD-07)
  // =============================
  async raiseDispute(dto: RaiseDisputeDto) {
    const record = await this.recordModel.findById(dto.appraisalId);
    if (!record) throw new BadRequestException('Appraisal record not found');

    const assignment = await this.assignmentModel.findById(dto.assignmentId);
    if (!assignment) throw new BadRequestException('Assignment not found');

    const cycle = await this.cycleModel.findById(dto.cycleId);
    if (!cycle) throw new BadRequestException('Cycle not found');

    if (!record.hrPublishedAt) {
      throw new BadRequestException('Cannot dispute unpublished record');
    }

    // Prevent disputing after acknowledgement
    if (record.employeeAcknowledgedAt) {
      throw new ConflictException('Cannot raise dispute after employee has acknowledged the record');
    }

    const daysSincePublish = Math.floor(
      (Date.now() - record.hrPublishedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSincePublish > 7) {
      throw new BadRequestException('Dispute window has closed. Appeals must be filed within 7 days of publication.');
    }

    const existingDispute = await this.disputeModel.findOne({
      appraisalId: dto.appraisalId,
      status: { $in: [AppraisalDisputeStatus.OPEN, AppraisalDisputeStatus.UNDER_REVIEW] }
    });

    if (existingDispute) {
      throw new ConflictException('An active dispute already exists for this appraisal');
    }

    // Validate dispute reason
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('Dispute reason is required');
    }

    const dispute = new this.disputeModel({
      ...dto,
      status: AppraisalDisputeStatus.OPEN,
      submittedAt: new Date()
    });

    return dispute.save();
  }

  async resolveDispute(id: string, dto: ResolveDisputeDto) {
    const dispute = await this.disputeModel.findById(id);
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status !== AppraisalDisputeStatus.OPEN && dispute.status !== AppraisalDisputeStatus.UNDER_REVIEW) {
      throw new ConflictException('Only open or under-review disputes can be resolved');
    }

    dispute.status = dto.status;
    dispute.resolutionSummary = dto.resolutionSummary;
    dispute.resolvedByEmployeeId = dto.resolvedBy;
    dispute.resolvedAt = new Date();

    // If dispute resolution changes the record rating/score, caller should update the underlying record separately.
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
  const disputes = await this.disputeModel
    .find(query)
    .populate('appraisalId raisedByEmployeeId resolvedByEmployeeId')
    .exec();

  if (!disputes || disputes.length === 0) {
    throw new NotFoundException('No disputes found');
  }

  return disputes;
}
  // =============================
  // Reminders, Reports, Dashboard, Department Progress
  // =============================
  async sendPendingReminders(cycleId: string) {
    const cycle = await this.cycleModel.findById(cycleId);
    if (!cycle) throw new NotFoundException('Cycle not found');

    const pendingAssignments = await this.assignmentModel
      .find({
        cycleId,
        status: { $in: [AppraisalAssignmentStatus.NOT_STARTED, AppraisalAssignmentStatus.IN_PROGRESS] }
      })
      .populate('managerProfileId employeeProfileId');

    return pendingAssignments.map(a => ({
      assignmentId: a._id,
      managerId: a.managerProfileId,
      employeeId: a.employeeProfileId,
      status: a.status,
      dueDate: a.dueDate
    }));
  }

  async getEmployeeAppraisalHistory(employeeId: string, limit?: number) {
    const query = this.recordModel
      .find({ employeeProfileId: employeeId, status: AppraisalRecordStatus.HR_PUBLISHED })
      .sort({ hrPublishedAt: -1 })
      .populate('cycleId templateId managerProfileId');

    if (limit) query.limit(limit);

    return query.exec();
  }

  async getEmployeeAppraisalTrends(employeeId: string) {
    const history = await this.getEmployeeAppraisalHistory(employeeId);
    const trends = history.map(record => ({
      date: record.hrPublishedAt,
      cycleName: (record.cycleId as any)?.name,
      totalScore: record.totalScore,
      overallRating: record.overallRatingLabel,
      templateType: (record.templateId as any)?.templateType
    }));

    return {
      employeeId,
      totalAppraisals: trends.length,
      trends,
      averageScore: trends.reduce((sum, t) => sum + (t.totalScore || 0), 0) / trends.length || 0
    };
  }

  async generateCycleReport(cycleId: string) {
    const cycle = await this.cycleModel.findById(cycleId);
    if (!cycle) throw new NotFoundException('Cycle not found');

    const assignments = await this.assignmentModel
      .find({ cycleId })
      .populate('employeeProfileId managerProfileId departmentId templateId');

    const records = await this.recordModel
      .find({ cycleId })
      .populate('employeeProfileId managerProfileId');

    const disputes = await this.disputeModel
      .find({ cycleId })
      .populate('raisedByEmployeeId resolvedByEmployeeId');

    const stats = {
      totalAssignments: assignments.length,
      completedRecords: records.filter(r => r.status === AppraisalRecordStatus.HR_PUBLISHED).length,
      pendingSubmissions: assignments.filter(a => [AppraisalAssignmentStatus.NOT_STARTED, AppraisalAssignmentStatus.IN_PROGRESS].includes(a.status)).length,
      totalDisputes: disputes.length,
      openDisputes: disputes.filter(d => d.status === AppraisalDisputeStatus.OPEN).length
    };

    return { cycle, stats, assignments, records, disputes };
  }

  async generateDepartmentReport(departmentId: string, cycleId?: string) {
    const department = await this.departmentModel.findById(departmentId);
    if (!department) throw new NotFoundException('Department not found');

    const query: any = { departmentId };
    if (cycleId) query.cycleId = cycleId;

    const assignments = await this.assignmentModel
      .find(query)
      .populate('employeeProfileId managerProfileId cycleId templateId');

    const assignmentIds = assignments.map(a => a._id);
    const records = await this.recordModel
      .find({ assignmentId: { $in: assignmentIds } })
      .populate('employeeProfileId');

    const completionRate = assignments.length > 0
      ? (records.filter(r => r.status === AppraisalRecordStatus.HR_PUBLISHED).length / assignments.length) * 100
      : 0;

    const averageScore = records.length > 0
      ? records.reduce((sum, r) => sum + (r.totalScore || 0), 0) / records.length
      : 0;

    return {
      department: { id: department._id, name: department.name },
      stats: {
        totalEmployees: assignments.length,
        completedAppraisals: records.filter(r => r.status === AppraisalRecordStatus.HR_PUBLISHED).length,
        completionRate: Math.round(completionRate * 100) / 100,
        averageScore: Math.round(averageScore * 100) / 100
      },
      assignments,
      records
    };
  }

  async exportAllRecords(cycleId?: string, format: 'json' | 'csv' = 'json') {
    const query: any = {};
    if (cycleId) query.cycleId = cycleId;

    const records = await this.recordModel
      .find(query)
      .populate('cycleId templateId employeeProfileId managerProfileId')
      .exec();

    if (format === 'csv') {
      return records.map(r => ({
        RecordId: r._id,
        EmployeeName: (r.employeeProfileId as any)?.firstName + ' ' + (r.employeeProfileId as any)?.lastName,
        ManagerName: (r.managerProfileId as any)?.firstName + ' ' + (r.managerProfileId as any)?.lastName,
        CycleName: (r.cycleId as any)?.name,
        TemplateName: (r.templateId as any)?.name,
        TotalScore: r.totalScore,
        OverallRating: r.overallRatingLabel,
        Status: r.status,
        SubmittedDate: r.managerSubmittedAt,
        PublishedDate: r.hrPublishedAt
      }));
    }

    return { format: 'json', data: records };
  }

  async dashboardStats(departmentId?: string) {
    const query: any = {};
    if (departmentId) query.departmentId = departmentId;

    const totalCycles = await this.cycleModel.countDocuments();
    const activeCycles = await this.cycleModel.countDocuments({ status: AppraisalCycleStatus.ACTIVE });
    const totalAssignments = await this.assignmentModel.countDocuments(query);
    const submittedRecords = await this.recordModel.countDocuments({ ...query, status: AppraisalRecordStatus.MANAGER_SUBMITTED });
    const publishedRecords = await this.recordModel.countDocuments({ ...query, status: AppraisalRecordStatus.HR_PUBLISHED });
    const openDisputes = await this.disputeModel.countDocuments({ status: AppraisalDisputeStatus.OPEN });

    return {
      totalCycles,
      activeCycles,
      totalAssignments,
      submittedRecords,
      publishedRecords,
      openDisputes,
      completionRate: totalAssignments > 0 ? (publishedRecords / totalAssignments) * 100 : 0
    };
  }

  async getDepartmentProgress(cycleId?: string) {
    const query: any = {};
    if (cycleId) query.cycleId = cycleId;

    const assignments = await this.assignmentModel
      .find(query)
      .populate('departmentId');

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
          acknowledged: 0
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

      dept.completionRate = dept.total > 0 ? (dept.published + dept.acknowledged) / dept.total * 100 : 0;
    }

    return Array.from(departmentMap.values()).sort((a, b) => a.completionRate - b.completionRate);
  }
}
