import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  EmployeeProfile,
  EmployeeProfileDocument,
} from '../employee-profile/models/employee-profile.schema';

import {
  Department,
  DepartmentDocument,
} from './models/department.schema';
import {
  Position,
  PositionDocument,
} from './models/position.schema';
import {
  PositionAssignment,
  PositionAssignmentDocument,
} from './models/position-assignment.schema';
import {
  StructureChangeLog,
  StructureChangeLogDocument,
} from './models/structure-change-log.schema';
import {
  StructureChangeRequest,
  StructureChangeRequestDocument,
} from './models/structure-change-request.schema';
import {
  StructureApproval,
  StructureApprovalDocument,
} from './models/structure-approval.schema';

import {
  ApprovalDecision,
  ChangeLogAction,
  StructureRequestStatus,
  StructureRequestType,
} from './enums/organization-structure.enums';

import { CreateDepartmentDto } from './DTOs/create-department.dto';
import { UpdateDepartmentDto } from './DTOs/update-department.dto';
import { CreatePositionDto } from './DTOs/create-position.dto';
import { UpdatePositionDto } from './DTOs/update-position.dto';
import { DeactivatePositionDto } from './DTOs/deactivate-position.dto';
import { CreateStructureChangeRequestDto } from './DTOs/create-structure-change-request.dto';
import { ApproveStructureChangeRequestDto } from './DTOs/approve-structure-change-request.dto';
import { RejectStructureChangeRequestDto } from './DTOs/reject-structure-change-request.dto';

@Injectable()
export class OrganizationStructureService {
  constructor(
    @InjectModel(Department.name)
    private readonly deptModel: Model<DepartmentDocument>,

    @InjectModel(Position.name)
    private readonly posModel: Model<PositionDocument>,

    @InjectModel(PositionAssignment.name)
    private readonly assignmentModel: Model<PositionAssignmentDocument>,

    @InjectModel(StructureChangeRequest.name)
    private readonly requestModel: Model<StructureChangeRequestDocument>,

    @InjectModel(StructureChangeLog.name)
    private readonly logModel: Model<StructureChangeLogDocument>,

    @InjectModel(StructureApproval.name)
    private readonly approvalModel: Model<StructureApprovalDocument>,
    
        @InjectModel(EmployeeProfile.name)
    private readonly employeeModel: Model<EmployeeProfileDocument>,

  ) {}

  // -----------------------------------------------------------
  // LOGGING HELPER (SAFE SNAPSHOT CLEANING)
  // -----------------------------------------------------------
  private cleanSnapshot(object: any) {
    return object ? JSON.parse(JSON.stringify(object)) : undefined;
  }

  private async logChange(entry: {
    action: ChangeLogAction;
    entityType: string;
    entityId: Types.ObjectId;
    beforeSnapshot?: any;
    afterSnapshot?: any;
    summary?: string;
    performedByEmployeeId?: string | Types.ObjectId;
  }) {
    const cleanBefore = this.cleanSnapshot(entry.beforeSnapshot);
    const cleanAfter = this.cleanSnapshot(entry.afterSnapshot);

    await this.logModel.create({
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      beforeSnapshot: cleanBefore,
      afterSnapshot: cleanAfter,
      summary: entry.summary,
      performedByEmployeeId: entry.performedByEmployeeId
        ? new Types.ObjectId(entry.performedByEmployeeId)
        : undefined,
    });
  }

  private generateRequestNumber(): string {
    return `OSR-${Date.now()}`;
  }

  // -----------------------------------------------------------
  // CREATE DEPARTMENT
  // -----------------------------------------------------------
async createDepartment(dto: CreateDepartmentDto) {
  const exists = await this.deptModel.findOne({ code: dto.code });
  if (exists) {
    throw new ConflictException('Department code must be unique.');
  }

  // 🔍 Validate performedByEmployeeId exists
  if (dto.performedByEmployeeId) {
    const empExists = await this.employeeModel.findById(dto.performedByEmployeeId);
    if (!empExists) {
      throw new NotFoundException(
        `Employee with ID ${dto.performedByEmployeeId} does not exist.`,
      );
    }
  }

  const created = await this.deptModel.create({
    ...dto,
    isActive: true,
  });

  await this.logChange({
    action: ChangeLogAction.CREATED,
    entityType: 'Department',
    entityId: created._id,
    afterSnapshot: this.cleanSnapshot(created.toObject()),
    performedByEmployeeId: dto.performedByEmployeeId,
    summary: `Department ${created.code} created`,
  });

  return created;
}
  // -----------------------------------------------------------
  // UPDATE DEPARTMENT
  // -----------------------------------------------------------
  async updateDepartment(id: string, dto: UpdateDepartmentDto) {
    const dept = await this.deptModel.findById(id);
    if (!dept) throw new NotFoundException('Department not found.');

    const before = this.cleanSnapshot(dept.toObject());

    Object.assign(dept, dto);
    const updated = await dept.save();

    await this.logChange({
      action: ChangeLogAction.UPDATED,
      entityType: 'Department',
      entityId: updated._id,
      beforeSnapshot: before,
      afterSnapshot: this.cleanSnapshot(updated.toObject()),
      summary: `Department ${updated.code} updated`,
    });

    return updated;
  }

  // -----------------------------------------------------------
  // CREATE POSITION
  // -----------------------------------------------------------
  async createPosition(dto: CreatePositionDto) {
    const dept = await this.deptModel.findById(dto.departmentId);
    if (!dept || !dept.isActive) {
      throw new BadRequestException('Invalid department.');
    }

    const exists = await this.posModel.findOne({ code: dto.code });
    if (exists) {
      throw new ConflictException('Position code already exists.');
    }

    const created = await this.posModel.create({
      ...dto,
      isActive: true,
    });

    await this.logChange({
      action: ChangeLogAction.CREATED,
      entityType: 'Position',
      entityId: created._id,
      afterSnapshot: this.cleanSnapshot(created.toObject()),
      performedByEmployeeId: dto.performedByEmployeeId,
      summary: `Position ${created.code} created`,
    });

    return created;
  }

  // -----------------------------------------------------------
  // UPDATE POSITION
  // -----------------------------------------------------------
  async updatePosition(id: string, dto: UpdatePositionDto) {
    const position = await this.posModel.findById(id);
    if (!position) {
      throw new NotFoundException('Position not found.');
    }

    const before = this.cleanSnapshot(position.toObject());

    Object.assign(position, dto);
    const updated = await position.save();

    await this.logChange({
      action: ChangeLogAction.UPDATED,
      entityType: 'Position',
      entityId: updated._id,
      beforeSnapshot: before,
      afterSnapshot: this.cleanSnapshot(updated.toObject()),
      summary: `Position ${updated.code} updated`,
    });

    return updated;
  }

  // -----------------------------------------------------------
  // DEACTIVATE (DELIMIT) POSITION
  // -----------------------------------------------------------
  async deactivatePosition(id: string, dto: DeactivatePositionDto) {
    const pos = await this.posModel.findById(id);
    if (!pos) {
      throw new NotFoundException('Position not found.');
    }

    if (!pos.isActive) return pos;

    const before = this.cleanSnapshot(pos.toObject());
    const closedAt = dto.closedAt ?? new Date();

    const activeAssignments = await this.assignmentModel.find({
      positionId: pos._id,
      endDate: { $exists: false },
    });

    for (const a of activeAssignments) {
      a.endDate = closedAt;
      if (dto.reason) a.reason = dto.reason;
      if (dto.notes) a.notes = dto.notes;
      await a.save();
    }

    pos.isActive = false;
    const updated = await pos.save();

    await this.logChange({
      action: ChangeLogAction.DEACTIVATED,
      entityType: 'Position',
      entityId: pos._id,
      beforeSnapshot: before,
      afterSnapshot: this.cleanSnapshot(updated.toObject()),
      performedByEmployeeId: dto.performedByEmployeeId,
      summary: `Position ${pos.code} deactivated`,
    });

    return updated;
  }

  // -----------------------------------------------------------
  // TREE VIEW
  // -----------------------------------------------------------
  async getOrgTree() {
    const depts = await this.deptModel.find({ isActive: true }).lean();
    const positions = await this.posModel.find({ isActive: true }).lean();

    const posMap = new Map<string, any>();

    for (const p of positions) {
      posMap.set(p._id.toString(), {
        ...p,
        _id: p._id.toString(),
        departmentId: p.departmentId.toString(),
        reportsToPositionId: p.reportsToPositionId?.toString(),
        children: [],
      });
    }

    for (const p of posMap.values()) {
      if (p.reportsToPositionId && posMap.has(p.reportsToPositionId)) {
        posMap.get(p.reportsToPositionId).children.push(p);
      }
    }

    return depts.map((d) => ({
      department: {
        _id: d._id.toString(),
        code: d.code,
        name: d.name,
        description: d.description,
      },
      positions: [...posMap.values()].filter(
        (p) =>
          p.departmentId === d._id.toString() &&
          !p.reportsToPositionId,
      ),
    }));
  }

  // -----------------------------------------------------------
  // CREATE CHANGE REQUEST
  // -----------------------------------------------------------
  async createChangeRequest(dto: CreateStructureChangeRequestDto) {
    const requestNumber =
      dto.requestNumber ?? this.generateRequestNumber();

    const created = await this.requestModel.create({
      requestNumber,
      requestedByEmployeeId: new Types.ObjectId(dto.requestedByEmployeeId),
      requestType: dto.requestType,
      targetDepartmentId: dto.targetDepartmentId
        ? new Types.ObjectId(dto.targetDepartmentId)
        : undefined,
      targetPositionId: dto.targetPositionId
        ? new Types.ObjectId(dto.targetPositionId)
        : undefined,
      details: dto.details ? JSON.stringify(dto.details) : undefined,
      reason: dto.reason,
      status: StructureRequestStatus.SUBMITTED,
      submittedByEmployeeId: new Types.ObjectId(dto.requestedByEmployeeId),
      submittedAt: new Date(),
    });

    await this.logChange({
      action: ChangeLogAction.CREATED,
      entityType: 'StructureChangeRequest',
      entityId: created._id,
      afterSnapshot: this.cleanSnapshot(created.toObject()),
      performedByEmployeeId: dto.requestedByEmployeeId,
      summary: `Change Request ${requestNumber} created`,
    });

    return created;
  }

  // -----------------------------------------------------------
  // GET PENDING REQUESTS
  // -----------------------------------------------------------
  async getPendingChangeRequests() {
    return this.requestModel
      .find({
        status: {
          $in: [
            StructureRequestStatus.SUBMITTED,
            StructureRequestStatus.UNDER_REVIEW,
          ],
        },
      })
      .lean();
  }

  // -----------------------------------------------------------
  // APPLY APPROVED CHANGE
  // -----------------------------------------------------------
  private async applyApprovedChange(
    req: StructureChangeRequestDocument,
  ) {
    switch (req.requestType) {
      case StructureRequestType.CLOSE_POSITION:
        if (req.targetPositionId)
          await this.deactivatePosition(
            req.targetPositionId.toString(),
            { closedAt: new Date(), reason: req.reason },
          );
        break;

      case StructureRequestType.UPDATE_POSITION:
        if (req.targetPositionId && req.details) {
          const data = JSON.parse(req.details);
          await this.updatePosition(
            req.targetPositionId.toString(),
            data,
          );
        }
        break;

      case StructureRequestType.UPDATE_DEPARTMENT:
        if (req.targetDepartmentId && req.details) {
          const data = JSON.parse(req.details);
          await this.updateDepartment(
            req.targetDepartmentId.toString(),
            data,
          );
        }
        break;

      default:
        break;
    }
  }

  // -----------------------------------------------------------
  // APPROVE
  // -----------------------------------------------------------
  async approveChangeRequest(
    requestId: Types.ObjectId,
    dto: ApproveStructureChangeRequestDto,
  ) {
    const req = await this.requestModel.findById(requestId);
    if (!req) throw new NotFoundException('Request not found.');

    if (
      req.status === StructureRequestStatus.APPROVED ||
      req.status === StructureRequestStatus.REJECTED
    ) {
      throw new BadRequestException('Request already finalized.');
    }

    const before = this.cleanSnapshot(req.toObject());

    req.status = StructureRequestStatus.APPROVED;
    await req.save();

    await this.approvalModel.create({
      changeRequestId: req._id,
      approverEmployeeId: new Types.ObjectId(dto.approverEmployeeId),
      decision: ApprovalDecision.APPROVED,
      decidedAt: new Date(),
      comments: dto.comments,
    });

    await this.applyApprovedChange(req);

    await this.logChange({
      action: ChangeLogAction.UPDATED,
      entityType: 'StructureChangeRequest',
      entityId: req._id,
      beforeSnapshot: before,
      afterSnapshot: this.cleanSnapshot(req.toObject()),
      performedByEmployeeId: dto.approverEmployeeId,
      summary: `Request ${req.requestNumber} approved`,
    });

    return req;
  }

  // -----------------------------------------------------------
  // REJECT
  // -----------------------------------------------------------
  async rejectChangeRequest(
    requestId: Types.ObjectId,
    dto: RejectStructureChangeRequestDto,
  ) {
    const req = await this.requestModel.findById(requestId);
    if (!req) throw new NotFoundException('Request not found.');

    if (
      req.status === StructureRequestStatus.APPROVED ||
      req.status === StructureRequestStatus.REJECTED
    ) {
      throw new BadRequestException('Already finalized.');
    }

    const before = this.cleanSnapshot(req.toObject());

    req.status = StructureRequestStatus.REJECTED;
    await req.save();

    await this.approvalModel.create({
      changeRequestId: req._id,
      approverEmployeeId: new Types.ObjectId(dto.approverEmployeeId),
      decision: ApprovalDecision.REJECTED,
      decidedAt: new Date(),
      comments: dto.comments,
    });

    await this.logChange({
      action: ChangeLogAction.UPDATED,
      entityType: 'StructureChangeRequest',
      entityId: req._id,
      beforeSnapshot: before,
      afterSnapshot: this.cleanSnapshot(req.toObject()),
      performedByEmployeeId: dto.approverEmployeeId,
      summary: `Request ${req.requestNumber} rejected`,
    });

    return req;
  }
}
