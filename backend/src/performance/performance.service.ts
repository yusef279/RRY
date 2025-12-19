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
  UpdateAppraisalRecordDto,
  
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

// In your performance.service.ts - update the getCycleById method:

async getCycleById(id: string) {
  // Validate the ID format first
  if (!id || typeof id !== 'string') {
    throw new BadRequestException('Invalid cycle ID format');
  }

  // Check if it's a valid MongoDB ObjectId
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException('Invalid cycle ID: must be a valid ObjectId');
  }

  const cycle = await this.cycleModel.findById(id).exec();
  
  if (!cycle) {
    throw new NotFoundException(`Cycle with ID ${id} not found`);
  }
  
  return cycle;
}

async updateCycle(id: string, dto: Partial<CreateCycleDto>) {
  const cycle = await this.cycleModel.findById(id);
  if (!cycle) {
    throw new NotFoundException('Cycle not found');
  }

  // Prevent updating certain fields if cycle is active or closed
  if (cycle.status === AppraisalCycleStatus.ACTIVE || cycle.status === AppraisalCycleStatus.CLOSED) {
    // Only allow updating non-critical fields
    const allowedUpdates = ['managerDueDate', 'employeeAcknowledgementDueDate', 'description'];
    const updates: any = {};
    
    for (const key of allowedUpdates) {
      if (dto[key] !== undefined) {
        updates[key] = dto[key];
      }
    }
    
    return await this.cycleModel.findByIdAndUpdate(id, updates, { new: true });
  }

  // For planned cycles, allow full update
  return await this.cycleModel.findByIdAndUpdate(id, dto, { new: true });
}
  /* =========================================================
      Assignments (REQ-PP-05, REQ-PP-13) – NO CHANGES
     ========================================================= */
async getAssignments(filters: {
  cycleId?: string;
  employeeId?: string;
  managerId?: string;
  status?: string;
}) {
  const query: any = {};
  
  if (filters.cycleId) query.cycleId = filters.cycleId;
  if (filters.employeeId) query.employeeProfileId = filters.employeeId;
  if (filters.managerId) query.managerProfileId = filters.managerId;
  if (filters.status) query.status = filters.status;
  
  return this.assignmentModel
    .find(query)
    .populate('templateId')
    .populate('cycleId')
    .populate('employeeProfileId', 'firstName lastName employeeNumber workEmail departmentName positionTitle')
    .populate('managerProfileId', 'firstName lastName workEmail')
    .lean()
    .exec();
}
async bulkAssign(dto: BulkAssignDto, currentUser?: AuthUser) {

  if (!dto.assignments?.length)
    throw new BadRequestException('No assignments provided');

  const prepared: any[] = [];

  for (const a of dto.assignments) {
    // basic existence checks
    const [cycle, emp, dep, template] = await Promise.all([
      this.cycleModel.findById(a.cycleId),
      this.employeeModel.findById(a.employeeProfileId),
      this.departmentModel.findById(a.departmentId),
      this.templateModel.findById(a.templateId),
    ]);

    if (!cycle) throw new BadRequestException(`Cycle ${a.cycleId} not found`);
    if (!emp) throw new BadRequestException(`Employee ${a.employeeProfileId} not found`);
    if (!dep) throw new BadRequestException(`Department ${a.departmentId} not found`);
    if (!template) throw new BadRequestException(`Template ${a.templateId} not found`);

    // template applicability
    if (
      Array.isArray((template as any).applicableDepartmentIds) &&
      (template as any).applicableDepartmentIds.length
    ) {
      const tplDeps = (template as any).applicableDepartmentIds.map((d: any) =>
        Types.ObjectId.isValid(d) ? new Types.ObjectId(d).toString() : d.toString(),
      );
      if (!tplDeps.includes(a.departmentId.toString()))
        throw new ConflictException(`Template not applicable to department`);
    }

    // duplicate check
    const existing = await this.assignmentModel.findOne({
      employeeProfileId: a.employeeProfileId,
      cycleId: a.cycleId,
      templateId: a.templateId,
    });
    if (existing) throw new ConflictException('Assignment already exists for employee in cycle');

    // KEEP the manager that the UI sent
    prepared.push({
      cycleId: a.cycleId,
      templateId: a.templateId,
      employeeProfileId: a.employeeProfileId,
      departmentId: a.departmentId,
      positionId: a.positionId || undefined,
      status: a.status || AppraisalAssignmentStatus.NOT_STARTED,
      managerProfileId: a.managerProfileId, // ← real manager
    });

  }

  const result = await this.assignmentModel.insertMany(prepared);
  return result;
}
async getAssignmentsForManager(managerId: string, user?: AuthUser) {
  /* ---------- sanity check ---------- */
  const manager = await this.employeeModel.findById(managerId);
  if (!manager)
    throw new NotFoundException(`Manager ${managerId} not found`);

  /* ---------- the only filter we need ---------- */
  const assignments = await this.assignmentModel
    .find({
      managerProfileId: managerId,                // ← logged-in manager
      status: {
        $in: [
          AppraisalAssignmentStatus.NOT_STARTED,
          AppraisalAssignmentStatus.IN_PROGRESS,
          AppraisalAssignmentStatus.SUBMITTED,
        ],
      },
    })
    .populate('cycleId templateId employeeProfileId departmentId positionId')
    .lean()
    .sort({ createdAt: -1 });

  return assignments;
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
// In your performance.service.ts - update the listRecords method

async listRecords(query: any = {}) {
  const mongoQuery: any = {};
  
  if (query.status) {
    mongoQuery.status = query.status;
  }
  
  const records = await this.recordModel
    .find(mongoQuery)
    .populate('employeeProfileId', 'firstName lastName employeeNumber department')
    .populate('employeeProfileId.department', 'name code') // Add this to populate department details
    .populate('managerProfileId', 'firstName lastName')
    .populate('cycleId', 'name startDate')
    .populate('templateId', 'name')
    .sort({ hrPublishedAt: -1 })
    .exec();
    
  return records;
}
/* =========================================================
      NEW: Assignment Update Methods (working without answers field)
  ========================================================= */
async updateAssignment(id: string, updateData: { answers?: any; status?: AppraisalAssignmentStatus; dueDate?: Date }, user?: AuthUser) {
  if (user && !['HR_MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'].includes(user.role)) {
    // Check if user is the manager for this assignment
    const assignment = await this.assignmentModel.findById(id);
    if (!assignment) throw new NotFoundException('Assignment not found');
    
    if (assignment.managerProfileId?.toString() !== user.employeeId) {
      throw new ForbiddenException('You can only update your own assignments');
    }
  }

  const assignment = await this.assignmentModel.findById(id);
  if (!assignment) throw new NotFoundException('Assignment not found');

  // Since we don't have an answers field in the schema, we'll store it differently
  // For now, we'll update only status and dueDate
  const updateFields: any = {};
  
  if (updateData.status !== undefined) {
    // Validate status transition
    const validTransitions = {
      [AppraisalAssignmentStatus.NOT_STARTED]: [AppraisalAssignmentStatus.IN_PROGRESS],
      [AppraisalAssignmentStatus.IN_PROGRESS]: [AppraisalAssignmentStatus.SUBMITTED, AppraisalAssignmentStatus.NOT_STARTED],
      [AppraisalAssignmentStatus.SUBMITTED]: [AppraisalAssignmentStatus.PUBLISHED],
      [AppraisalAssignmentStatus.PUBLISHED]: [AppraisalAssignmentStatus.ACKNOWLEDGED],
    };

    const currentStatus = assignment.status;
    const allowedTransitions = validTransitions[currentStatus] || [];
    
    if (!allowedTransitions.includes(updateData.status)) {
      throw new BadRequestException(`Invalid status transition from ${currentStatus} to ${updateData.status}`);
    }

    updateFields.status = updateData.status;
    
    // Set submittedAt timestamp if status is SUBMITTED
    if (updateData.status === AppraisalAssignmentStatus.SUBMITTED) {
      updateFields.submittedAt = new Date();
    }
  }
  
  if (updateData.dueDate !== undefined) {
    updateFields.dueDate = updateData.dueDate;
  }

  // Update the assignment
  Object.assign(assignment, updateFields);
  return assignment.save();
}

/* =========================================================
      NEW: Save Draft Method (store answers in records instead)
  ========================================================= */
async saveDraft(id: string, answers: any, user?: AuthUser) {
  if (user && !['HR_MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'].includes(user.role)) {
    const assignment = await this.assignmentModel.findById(id);
    if (!assignment) throw new NotFoundException('Assignment not found');
    
    if (assignment.managerProfileId?.toString() !== user.employeeId) {
      throw new ForbiddenException('You can only save drafts for your own assignments');
    }
  }

  const assignment = await this.assignmentModel.findById(id);
  if (!assignment) throw new NotFoundException('Assignment not found');

  // Check if already submitted
  if (assignment.status === AppraisalAssignmentStatus.SUBMITTED || 
      assignment.status === AppraisalAssignmentStatus.PUBLISHED || 
      assignment.status === AppraisalAssignmentStatus.ACKNOWLEDGED) {
    throw new ConflictException('Cannot save draft for a submitted/published/acknowledged assignment');
  }

  // Since we don't have an answers field, we'll create a draft record
  // Create a draft record with status DRAFT
  const draftRecord = new this.recordModel({
    assignmentId: assignment._id,
    cycleId: assignment.cycleId,
    templateId: assignment.templateId,
    employeeProfileId: assignment.employeeProfileId,
    managerProfileId: assignment.managerProfileId || user?.employeeId,
    ratings: answers.ratings || [],
    status: 'DRAFT', // You might need to add this status to your enum
    totalScore: this.calculateTotalScore(answers.ratings || []),
    managerSubmittedAt: new Date(),
    isDraft: true
  });

  await draftRecord.save();

  // Update assignment status to IN_PROGRESS if not started
  if (assignment.status === AppraisalAssignmentStatus.NOT_STARTED) {
    assignment.status = AppraisalAssignmentStatus.IN_PROGRESS;
    await assignment.save();
  }

  return { 
    success: true, 
    message: 'Draft saved',
    draftRecordId: draftRecord._id 
  };
}

/* =========================================================
      NEW: Submit Assignment Method
  ========================================================= */
async submitAssignment(id: string, answers: any, user?: AuthUser) {
  if (user && !['HR_MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'].includes(user.role)) {
    const assignment = await this.assignmentModel.findById(id);
    if (!assignment) throw new NotFoundException('Assignment not found');
    
    if (assignment.managerProfileId?.toString() !== user.employeeId) {
      throw new ForbiddenException('You can only submit your own assignments');
    }
  }

  const assignment = await this.assignmentModel.findById(id);
  if (!assignment) throw new NotFoundException('Assignment not found');

  // Check if already submitted
  if (assignment.status === AppraisalAssignmentStatus.SUBMITTED || 
      assignment.status === AppraisalAssignmentStatus.PUBLISHED || 
      assignment.status === AppraisalAssignmentStatus.ACKNOWLEDGED) {
    throw new ConflictException('Assignment already submitted');
  }

  // Get template for validation
  const template = await this.templateModel.findById(assignment.templateId);
  if (!template) throw new BadRequestException('Template not found');

  // Validate required criteria if template has criteria
  if (template.criteria && Array.isArray(template.criteria)) {
    const missingRequired = template.criteria
      .filter((criterion: any) => criterion.required)
      .filter((criterion: any) => {
        const rating = answers.ratings?.find((r: any) => r.key === criterion.key);
        return !rating || rating.ratingValue === undefined || rating.ratingValue === null;
      });

    if (missingRequired.length > 0) {
      throw new BadRequestException(`Missing required ratings for: ${missingRequired.map((c: any) => c.title).join(', ')}`);
    }
  }

  // Update assignment status
  assignment.status = AppraisalAssignmentStatus.SUBMITTED;
  assignment.submittedAt = new Date();

  // Create a record
  const recordData = {
    assignmentId: assignment._id,
    cycleId: assignment.cycleId,
    templateId: assignment.templateId,
    employeeProfileId: assignment.employeeProfileId,
    managerProfileId: assignment.managerProfileId || user?.employeeId,
    ratings: answers.ratings || [],
    totalScore: this.calculateTotalScore(answers.ratings || [], template),
    status: 'MANAGER_SUBMITTED',
    managerSubmittedAt: new Date()
  };

  const record = new this.recordModel(recordData);
  await record.save();

  assignment.latestAppraisalId = record._id;
  await assignment.save();

  return { 
    success: true, 
    message: 'Appraisal submitted successfully',
    recordId: record._id 
  };
}

/* =========================================================
      Helper Method for Calculating Total Score
  ========================================================= */
private calculateTotalScore(ratings: any[], template?: any): number {
  if (!ratings.length) return 0;

  let totalScore = 0;
  
  for (const rating of ratings) {
    if (rating.weightedScore !== undefined) {
      totalScore += rating.weightedScore;
    } else if (rating.ratingValue !== undefined) {
      totalScore += rating.ratingValue;
    }
  }

  return totalScore;
}
  /* =========================================================
      Disputes (REQ-AE-07, REQ-OD-07) – USER-SCOPED where noted
     ========================================================= */
    
async raiseDispute(dto: RaiseDisputeDto, user?: AuthUser) {
  try {
    // Check user permissions
    if (user && !['HR_MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'].includes(user.role)) {
      if (!user.employeeId) {
        throw new ForbiddenException('User does not have an employee profile');
      }
      
      const userEmployeeId = String(user.employeeId);
    const dtoEmployeeId  = String(dto.raisedByEmployeeId);

      if (userEmployeeId !== dtoEmployeeId) {
        throw new ForbiddenException('You can only dispute your own appraisal');
      }
    }
    
    // Validate IDs are valid MongoDB IDs
    if (!Types.ObjectId.isValid(dto.appraisalId)) {
      throw new BadRequestException(`Invalid appraisalId: ${dto.appraisalId}`);
    }
    if (!Types.ObjectId.isValid(dto.assignmentId)) {
      throw new BadRequestException(`Invalid assignmentId: ${dto.assignmentId}`);
    }
    if (!Types.ObjectId.isValid(dto.cycleId)) {
      throw new BadRequestException(`Invalid cycleId: ${dto.cycleId}`);
    }
    if (!Types.ObjectId.isValid(dto.raisedByEmployeeId)) {
      throw new BadRequestException(`Invalid raisedByEmployeeId: ${dto.raisedByEmployeeId}`);
    }
    
    // Convert string IDs to ObjectId
    const appraisalId = new Types.ObjectId(dto.appraisalId);
    const assignmentId = new Types.ObjectId(dto.assignmentId);
    const cycleId = new Types.ObjectId(dto.cycleId);
    const raisedByEmployeeId = new Types.ObjectId(dto.raisedByEmployeeId);
    
    // Check if record exists
    const record = await this.recordModel.findById(appraisalId);
    if (!record) {
      throw new BadRequestException('Appraisal record not found');
    }
    
    // Check if assignment exists
    const assignment = await this.assignmentModel.findById(assignmentId);
    if (!assignment) {
      throw new BadRequestException('Assignment not found');
    }
    
    // Check if cycle exists
    const cycle = await this.cycleModel.findById(cycleId);
    if (!cycle) {
      throw new BadRequestException('Cycle not found');
    }
    
    // Validate the record belongs to the employee raising the dispute
    if (record.employeeProfileId.toString() !== raisedByEmployeeId.toString()) {
      throw new BadRequestException('Employee can only dispute their own appraisal');
    }
    
    // Check if record is published
    if (!record.hrPublishedAt) {
      throw new BadRequestException('Cannot dispute unpublished record');
    }
    
    // Check if already acknowledged
    if (record.employeeAcknowledgedAt) {
      throw new ConflictException('Cannot raise dispute after employee has acknowledged the record');
    }
    
    // Check 7-day dispute window
    const daysSincePublish = Math.floor((Date.now() - record.hrPublishedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSincePublish > 7) {
      throw new BadRequestException(`Dispute window has closed. ${daysSincePublish} days have passed since publication.`);
    }
    
    // Check for existing active dispute
    const existingDispute = await this.disputeModel.findOne({
      appraisalId: appraisalId,
      raisedByEmployeeId: raisedByEmployeeId,
      status: { $in: [AppraisalDisputeStatus.OPEN, AppraisalDisputeStatus.UNDER_REVIEW] }
    });
    
    if (existingDispute) {
      throw new ConflictException('An active dispute already exists for this appraisal');
    }
    
    // Validate reason
    if (!dto.reason?.trim()) {
      throw new BadRequestException('Dispute reason is required');
    }
    
    // Create dispute
const disputeData = {
      appraisalId: appraisalId,
      assignmentId: assignmentId,
      cycleId: cycleId,
      raisedByEmployeeId: raisedByEmployeeId,
      reason: dto.reason.trim(),
      details: dto.details?.trim(),
      status: AppraisalDisputeStatus.OPEN,
      submittedAt: new Date(),
    };
    
    // Method 1: Use create() with explicit _id generation
    const dispute = await this.disputeModel.create({
      ...disputeData,
      _id: new Types.ObjectId() // Explicitly generate _id
    });
    
    // Method 2: Or use insertOne() directly
    // const result = await this.disputeModel.collection.insertOne({
    //   ...disputeData,
    //   _id: new Types.ObjectId(),
    //   createdAt: new Date(),
    //   updatedAt: new Date()
    // });
    // const dispute = await this.disputeModel.findById(result.insertedId);
    
    // Method 3: Or fix the save() approach
    // const dispute = new this.disputeModel({
    //   _id: new Types.ObjectId(), // Add this line
    //   ...disputeData
    // });
    // await dispute.save();
    
    // Populate before returning
    const populatedDispute = await this.disputeModel
      .findById(dispute._id)
      .populate('appraisalId')
      .populate('raisedByEmployeeId', 'firstName lastName email')
      .populate('resolvedByEmployeeId', 'firstName lastName email')
      .lean();
    
    return populatedDispute;    
  } catch (error) {
    if (error.name === 'ValidationError') {
      console.error('Validation error:', error.errors);
    }
    throw error;
  }
}  

// performance.service.ts - update resolveDispute method
async resolveDispute(disputeId: string, resolutionData: any) {
  
  try {
    // ✅ 1. Validate dispute ID format
    if (!Types.ObjectId.isValid(disputeId)) {
      console.error('❌ Invalid dispute ID format:', disputeId);
      throw new BadRequestException(`Invalid dispute ID format: ${disputeId}`);
    }
    
    const objectId = new Types.ObjectId(disputeId);
    
    // ✅ 2. Find the dispute (try with and without populate)
    let dispute = await this.disputeModel.findById(objectId);
    
    if (!dispute) {
      // Try alternative lookup
      const allDisputesCount = await this.disputeModel.countDocuments({});
      
      if (allDisputesCount > 0) {
        const sampleDispute = await this.disputeModel.findOne({});
        console.log('📝 Sample dispute in DB:', {
          id: sampleDispute?._id,
          type: typeof sampleDispute?._id
        });
      }
      
      console.error('❌ Dispute not found in database for ID:', disputeId);
      throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
    }
    
    console.log('✅ Found dispute:', {
      id: dispute._id,
      status: dispute.status,
      appraisalId: dispute.appraisalId,
      raisedByEmployeeId: dispute.raisedByEmployeeId
    });
    
    // ✅ 3. Check if dispute is already resolved
    if (dispute.status === AppraisalDisputeStatus.ADJUSTED || 
        dispute.status === AppraisalDisputeStatus.REJECTED) {
      console.error('❌ Dispute already resolved:', dispute.status);
      throw new ConflictException(`Dispute already resolved with status: ${dispute.status}`);
    }
    
    // ✅ 4. Validate status
    const validStatuses = [AppraisalDisputeStatus.ADJUSTED, AppraisalDisputeStatus.REJECTED];
    if (!validStatuses.includes(resolutionData.status)) {
      console.error('❌ Invalid status:', resolutionData.status);
      throw new BadRequestException(
        `Status must be either ADJUSTED or REJECTED. Received: ${resolutionData.status}`
      );
    }
    
    // ✅ 5. Validate resolution summary
    if (!resolutionData.resolutionSummary?.trim()) {
      console.error('❌ Missing resolution summary');
      throw new BadRequestException('Resolution summary is required');
    }
    
    // ✅ 6. Validate resolvedBy is a valid employee
    if (!resolutionData.resolvedBy || !Types.ObjectId.isValid(resolutionData.resolvedBy)) {
      console.error('❌ Invalid resolvedBy ID:', resolutionData.resolvedBy);
      throw new BadRequestException('Valid resolvedBy employee ID is required');
    }
    
    const resolvedByEmployeeId = new Types.ObjectId(resolutionData.resolvedBy);
    const hrEmployee = await this.employeeModel.findById(resolvedByEmployeeId);
    if (!hrEmployee) {
      console.error('❌ HR employee not found:', resolutionData.resolvedBy);
      throw new BadRequestException('HR employee not found');
    }
    
    
    // ✅ 7. CRITICAL: Validate rating criteria against template max score
    if (resolutionData.status === AppraisalDisputeStatus.ADJUSTED && 
        resolutionData.updatedAppraisal?.ratings) {
      
      
      // Get the original appraisal
      const originalAppraisal = await this.recordModel.findById(dispute.appraisalId);
      if (!originalAppraisal) {
        console.error('❌ Original appraisal not found:', dispute.appraisalId);
        throw new NotFoundException('Original appraisal record not found');
      }
      
      
      // Get the template with criteria
      const template = await this.templateModel.findById(originalAppraisal.templateId);
      if (!template) {
        console.error(' Template not found for appraisal:', originalAppraisal.templateId);
        throw new NotFoundException('Template not found for this appraisal');
      }
      
      
      const templateCriteria = template.criteria || [];
      const updatedRatings = resolutionData.updatedAppraisal.ratings;
      
      
      if (templateCriteria.length === 0) {
        console.warn(' Template has no criteria defined');
      }
      
      // Create a map for quick lookup
      const criteriaMap = new Map();
      templateCriteria.forEach((criterion: any) => {
        criteriaMap.set(criterion.key, {
          title: criterion.title,
          maxScore: criterion.maxScore || template.ratingScale?.max || 5,
          required: criterion.required || false
        });
      });
      
      // Validate each updated rating
      for (const rating of updatedRatings) {
        const criterion = criteriaMap.get(rating.key);
        
        if (!criterion) {
          console.error('❌ Rating key not found in template:', rating.key);
          console.error('❌ Available keys:', Array.from(criteriaMap.keys()));
          throw new BadRequestException(
            `Rating for "${rating.title || rating.key}" does not match any template criteria`
          );
        }
        
        // Check max score constraint
        const maxAllowedScore = criterion.maxScore;
        if (rating.ratingValue > maxAllowedScore) {
          console.error('❌ Rating exceeds max:', {
            title: criterion.title,
            rating: rating.ratingValue,
            maxAllowed: maxAllowedScore
          });
          throw new BadRequestException(
            `Rating for "${criterion.title}" (${rating.ratingValue}) exceeds maximum allowed score of ${maxAllowedScore}`
          );
        }
        
        // Check if rating is within scale bounds
        const scaleMin = template.ratingScale?.min || 0;
        const scaleMax = template.ratingScale?.max || 5;
        
        if (rating.ratingValue < scaleMin || rating.ratingValue > scaleMax) {
          console.error('❌ Rating outside scale:', {
            title: criterion.title,
            rating: rating.ratingValue,
            scaleMin,
            scaleMax
          });
          throw new BadRequestException(
            `Rating for "${criterion.title}" must be between ${scaleMin} and ${scaleMax}`
          );
        }
        
        console.log('Rating validated:', {
          criterion: criterion.title,
          rating: rating.ratingValue,
          max: maxAllowedScore,
          withinBounds: true
        });
      }
      
    }
    
    // 8. Update dispute status
    dispute.set('status', resolutionData.status);
    dispute.set('resolutionSummary', resolutionData.resolutionSummary.trim());
    dispute.set('resolvedByEmployeeId', resolvedByEmployeeId);
    dispute.set('resolvedAt', new Date());
    
    // ✅ 9. If adjusted, update the appraisal record with new ratings
    if (resolutionData.status === AppraisalDisputeStatus.ADJUSTED && 
        resolutionData.updatedAppraisal) {
      
      
      const appraisal = await this.recordModel.findById(dispute.appraisalId);
      if (appraisal) {
        // Update with new ratings
        appraisal.set('totalScore', resolutionData.updatedAppraisal.totalScore);
        appraisal.set('overallRatingLabel', resolutionData.updatedAppraisal.overallRatingLabel);
        appraisal.set('ratings', resolutionData.updatedAppraisal.ratings);
        
        // Reset acknowledgment
        appraisal.set('employeeAcknowledgedAt', null);
        appraisal.set('employeeAcknowledgementComment', null);
        
        // Mark as updated
        appraisal.set('updatedAt', new Date());
        
        await appraisal.save();
        
        // Also update assignment status if it was acknowledged
        const assignment = await this.assignmentModel.findById(appraisal.assignmentId);
        if (assignment && assignment.status === AppraisalAssignmentStatus.ACKNOWLEDGED) {
          assignment.status = AppraisalAssignmentStatus.PUBLISHED;
          await assignment.save();
        }
      } else {
        console.error(' Appraisal not found for update:', dispute.appraisalId);
      }
      
      // Store updated appraisal data in dispute
      // Note: Your schema might not have this field
      try {
        if (dispute.schema.path('updatedAppraisal')) {
          dispute.set('updatedAppraisal', {
            totalScore: resolutionData.updatedAppraisal.totalScore,
            overallRatingLabel: resolutionData.updatedAppraisal.overallRatingLabel,
            ratings: resolutionData.updatedAppraisal.ratings
          });
        }
      } catch (error) {
        console.warn('updatedAppraisal field not in schema, skipping');
      }
    }
    
    //  10. Save the dispute
    await dispute.save();
    
    
    // ✅ 11. Populate before returning
    const populatedDispute = await this.disputeModel
      .findById(dispute._id)
      .populate('appraisalId')
      .populate('raisedByEmployeeId', 'firstName lastName email')
      .populate('resolvedByEmployeeId', 'firstName lastName email')
      .lean();
    
    return populatedDispute;
    
  } catch (error) {
    console.error('💥 Error in resolveDispute:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Re-throw the error so NestJS can handle it
    throw error;
  }
}
  async getDisputeById(id: string) {
    const dispute = await this.disputeModel
      .findById(id)
      .populate('appraisalId assignmentId cycleId raisedByEmployeeId resolvedByEmployeeId');
    if (!dispute) throw new NotFoundException('Dispute not found');
    return dispute;
  }

async listDisputes(query: any = {}) {
  
  try {
    // Handle query parameters - both array style (status[]=...) and regular
    let statusFilter: string[] = [];
    
    // Check for array-style parameters first (from frontend axios)
    if (query['status[]']) {
      statusFilter = Array.isArray(query['status[]']) 
        ? query['status[]'] 
        : [query['status[]']];
    }
    // Also check for regular status parameter (comma-separated or single)
    else if (query.status) {
      if (typeof query.status === 'string') {
        // Handle comma-separated string: "OPEN,UNDER_REVIEW"
        statusFilter = query.status.split(',').map((s: string) => s.trim());
      } else if (Array.isArray(query.status)) {
        statusFilter = query.status;
      }
    }
    
    
    // Build MongoDB query
    const mongoQuery: any = {};
    
    // Only add status filter if we have statuses to filter by
    if (statusFilter.length > 0) {
      mongoQuery.status = { $in: statusFilter };
    }
    
    
    // FIRST: Count how many documents match the query
    const count = await this.disputeModel.countDocuments(mongoQuery);
    
    // If count is 0 but we know disputes exist, log for debugging
    if (count === 0) {
      const totalInDB = await this.disputeModel.countDocuments({});
      
      // Get a sample dispute to see what's in DB
      const sampleDispute = await this.disputeModel.findOne({}).lean();
      
      // If we have disputes but none match query, show what statuses exist
      if (totalInDB > 0) {
        const allStatuses = await this.disputeModel.distinct('status');
      }
    }
    
    // Execute query with proper population
    const disputes = await this.disputeModel
      .find(mongoQuery)
      .populate({
        path: 'raisedByEmployeeId',
        select: 'firstName lastName email employeeId',
        model: 'EmployeeProfile'
      })
      .populate({
        path: 'resolvedByEmployeeId',
        select: 'firstName lastName email',
        model: 'EmployeeProfile'
      })
      .populate('appraisalId')
      .populate('assignmentId')
      .populate('cycleId')
      .sort({ submittedAt: -1 })
      .lean() // Use lean() for better performance
      .exec();
    
    
    return disputes;
    
  } catch (error) {
    console.error('[LIST DISPUTES] Error:', error);
    console.error('Error stack:', error.stack);
    
    // Return empty array instead of throwing to prevent frontend crash
    return [];
  }
}


// In performance.service.ts - updateAppraisalRecord method
async updateAppraisalRecord(id: string, dto: UpdateAppraisalRecordDto) {
  // First check if record exists
  const existingRecord = await this.recordModel.findById(id);
  if (!existingRecord) throw new NotFoundException('Record not found');
  
  // Check if this record is part of an active dispute
  const activeDispute = await this.disputeModel.findOne({
    appraisalId: id,
    status: { $in: [AppraisalDisputeStatus.OPEN, AppraisalDisputeStatus.UNDER_REVIEW] }
  });
  
  if (activeDispute) {
    throw new ConflictException('Cannot update record with active dispute');
  }
  
  // Build update object - don't include updatedAt, Mongoose handles it via timestamps
  const updateData: any = {};
  
  if (dto.ratings) updateData.ratings = dto.ratings;
  if (dto.totalScore !== undefined) updateData.totalScore = dto.totalScore;
  if (dto.overallRatingLabel) updateData.overallRatingLabel = dto.overallRatingLabel;
  if (dto.managerSummary) updateData.managerSummary = dto.managerSummary;
  if (dto.strengths) updateData.strengths = dto.strengths;
  if (dto.improvementAreas) updateData.improvementAreas = dto.improvementAreas;
  
  // Use findByIdAndUpdate - this will automatically update timestamps
  const updatedRecord = await this.recordModel.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );
  
  if (!updatedRecord) {
    throw new NotFoundException('Record not found after update');
  }
  
  // Also update the assignment if it exists
  const assignment = await this.assignmentModel.findById(updatedRecord.assignmentId);
  if (assignment) {
    // If record is updated after publishing, reset acknowledgment
    if (assignment.status === AppraisalAssignmentStatus.ACKNOWLEDGED) {
      assignment.status = AppraisalAssignmentStatus.PUBLISHED;
      await assignment.save();
    }
    
    // Update employee's appraisal history
    await this.employeeModel.findByIdAndUpdate(updatedRecord.employeeProfileId, {
      $pull: { appraisalHistory: { recordId: updatedRecord._id } }
    });
    
    await this.employeeModel.findByIdAndUpdate(updatedRecord.employeeProfileId, {
      $push: {
        appraisalHistory: {
          appraisalDate: updatedRecord.hrPublishedAt || new Date(),
          cycleId: updatedRecord.cycleId,
          templateId: updatedRecord.templateId,
          totalScore: updatedRecord.totalScore,
          overallRatingLabel: updatedRecord.overallRatingLabel,
          recordId: updatedRecord._id,
        }
      }
    });
  }
  
  return updatedRecord;
}
async getDisputesForManager(managerId: string, query: any = {}) {  
  try {
    // Validate manager ID
    if (!Types.ObjectId.isValid(managerId)) {
      return []; // Return empty array for invalid ID
    }
    
    const managerObjectId = new Types.ObjectId(managerId);
    
    // First, get all assignments created by this manager
    const managerAssignments = await this.assignmentModel
      .find({ managerProfileId: managerObjectId })
      .select('_id')
      .lean();
    
    if (managerAssignments.length === 0) {
      return []; // No assignments, no disputes
    }
    
    const assignmentIds = managerAssignments.map(a => a._id);
    
    // Build the query
    const disputeQuery: any = {
      assignmentId: { $in: assignmentIds }
    };
    
    // Add status filter if provided
    if (query.status) {
      if (Array.isArray(query.status)) {
        disputeQuery.status = { $in: query.status };
      } else {
        disputeQuery.status = query.status;
      }
    }
    
    // Find disputes for these assignments
    const disputes = await this.disputeModel
      .find(disputeQuery)
      .populate({
        path: 'appraisalId',
        select: 'totalScore overallRatingLabel ratings managerSummary strengths improvementAreas'
      })
      .populate({
        path: 'raisedByEmployeeId',
        select: 'firstName lastName email employeeNumber'
      })
      .populate({
        path: 'resolvedByEmployeeId',
        select: 'firstName lastName email'
      })
      .populate({
        path: 'assignmentId',
        select: 'employeeProfileId managerProfileId'
      })
      .populate({
        path: 'cycleId',
        select: 'name'
      })
      .sort({ submittedAt: -1 })
      .lean()
      .exec();
    
    return disputes;
    
  } catch (error) {
    console.error('Error in getDisputesForManager:', error);
    return [];
  }
}

async getDisputeByAppraisalAndEmployee(appraisalId: string, employeeId: string) {
  try {
    // Validate IDs
    if (!Types.ObjectId.isValid(appraisalId) || !Types.ObjectId.isValid(employeeId)) {
      return null;
    }
    
    const dispute = await this.disputeModel
      .findOne({
        appraisalId: new Types.ObjectId(appraisalId),
        raisedByEmployeeId: new Types.ObjectId(employeeId)
      })
      .populate({
        path: 'appraisalId',
        select: 'totalScore overallRatingLabel ratings'
      })
      .populate({
        path: 'raisedByEmployeeId',
        select: 'firstName lastName'
      })
      .populate({
        path: 'resolvedByEmployeeId',
        select: 'firstName lastName'
      })
      .lean()
      .exec();
    
    return dispute;
  } catch (error) {
    console.error('Error getting dispute:', error);
    return null;
  }
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