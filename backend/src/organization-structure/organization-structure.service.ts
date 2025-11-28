import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

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
  StructureChangeRequest,
  StructureChangeRequestDocument,
} from './models/structure-change-request.schema';
import {
  StructureChangeLog,
  StructureChangeLogDocument,
} from './models/structure-change-log.schema';
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

import {
  EmployeeProfile,
  EmployeeProfileDocument,
} from '../employee-profile/models/employee-profile.schema';

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

    // @Inject(NotificationService) private readonly notificationService: NotificationService,
  ) {}

  // ============================================================
  // UTILITIES
  // ============================================================

  private clean(obj: any) {
    return obj ? JSON.parse(JSON.stringify(obj)) : undefined;
  }

  private async notify(event: string, payload: any) {
    // If you have NotificationService:
    // await this.notificationService.send(event, payload);

    // Safe fallback:
    console.log('NOTIFICATION:', event, payload);
  }

  private async log(entry: {
    action: ChangeLogAction;
    entityType: string;
    entityId: Types.ObjectId;
    before?: any;
    after?: any;
    summary?: string;
    performedByEmployeeId?: string;
  }) {
    try {
      await this.logModel.create({
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        beforeSnapshot: this.clean(entry.before),
        afterSnapshot: this.clean(entry.after),
        summary: entry.summary,
        performedByEmployeeId: entry.performedByEmployeeId
          ? new Types.ObjectId(entry.performedByEmployeeId)
          : undefined,
      });
    } catch (err) {
      console.error('StructureChangeLog error:', err);
    }
  }

  private generateReqNumber() {
    return `OSR-${Date.now()}`;
  }

  // ============================================================
  // CIRCULAR REPORTING VALIDATION (REQ-OSM-09)
  // ============================================================

  private async createsCircularReporting(
    positionId: string,
    newManagerId: string,
  ): Promise<boolean> {
    if (!newManagerId) return false;

    let current = newManagerId;

    while (current) {
      if (current === positionId) return true;

      const manager = await this.posModel.findById(current).lean();
      if (!manager?.reportsToPositionId) break;

      current = manager.reportsToPositionId.toString();
    }

    return false;
  }

  // ============================================================
  // DEPARTMENTS
  // ============================================================

  async createDepartment(dto: CreateDepartmentDto) {
    if (!dto.performedByEmployeeId)
      throw new BadRequestException('performedByEmployeeId missing');

    const exists = await this.deptModel.findOne({ code: dto.code });
    if (exists) {
      throw new ConflictException('Department code must be unique.');
    }

    const created = await this.deptModel.create({
      code: dto.code,
      name: dto.name,
      description: dto.description,
      isActive: true,
    });

    await this.log({
      action: ChangeLogAction.CREATED,
      entityType: 'Department',
      entityId: created._id,
      after: created.toObject(),
      summary: `Department ${created.code} created`,
      performedByEmployeeId: dto.performedByEmployeeId,
    });

    await this.notify('DEPARTMENT_CREATED', created);

    return created;
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto) {
    if (!dto.performedByEmployeeId)
      throw new BadRequestException('performedByEmployeeId missing');

    const dept = await this.deptModel.findById(id);
    if (!dept) throw new NotFoundException('Department not found.');

    const before = this.clean(dept.toObject());
    Object.assign(dept, dto);
    const updated = await dept.save();

    await this.log({
      action: ChangeLogAction.UPDATED,
      entityType: 'Department',
      entityId: dept._id,
      before,
      after: updated.toObject(),
      summary: `Department ${dept.code} updated`,
      performedByEmployeeId: dto.performedByEmployeeId,
    });

    await this.notify('DEPARTMENT_UPDATED', updated);

    return updated;
  }

  async listDepartments() {
    return this.deptModel.find().lean();
  }

  async getDepartment(id: string) {
    const dept = await this.deptModel.findById(id).lean();
    if (!dept) throw new NotFoundException('Department not found.');
    return dept;
  }

  // ============================================================
  // POSITIONS
  // ============================================================

  async createPosition(dto: CreatePositionDto) {
    if (!dto.performedByEmployeeId)
      throw new BadRequestException('performedByEmployeeId missing');

    const exists = await this.posModel.findOne({ code: dto.code });
    if (exists) {
      throw new ConflictException('Position code must be unique.');
    }

    const dept = await this.deptModel.findById(dto.departmentId);
    if (!dept || !dept.isActive) {
      throw new BadRequestException('Invalid departmentId.');
    }

    if (dto.reportsToPositionId) {
      const manager = await this.posModel.findById(dto.reportsToPositionId);
      if (!manager) {
        throw new BadRequestException('reportsToPositionId does not exist.');
      }

      if (
        await this.createsCircularReporting(
          dto.reportsToPositionId,
          dto.reportsToPositionId,
        )
      ) {
        throw new BadRequestException('Circular reporting line detected.');
      }
    }

    const insertResult = await this.posModel.collection.insertOne({
      code: dto.code,
      title: dto.title,
      description: dto.description,
      departmentId: new Types.ObjectId(dto.departmentId),
      reportsToPositionId: dto.reportsToPositionId
        ? new Types.ObjectId(dto.reportsToPositionId)
        : null,
      jobKey: dto.jobKey,
      payGrade: dto.payGrade,
      costCenter: dto.costCenter,
      isActive: true,
    });

    const created = await this.posModel.findById(insertResult.insertedId);
    if (!created) {
      throw new NotFoundException('Position not found after creation.');
    }

    await this.log({
      action: ChangeLogAction.CREATED,
      entityType: 'Position',
      entityId: created._id,
      after: created.toObject(),
      summary: `Position ${created.code} created`,
      performedByEmployeeId: dto.performedByEmployeeId,
    });

    await this.notify('POSITION_CREATED', created);

    return created;
  }

  async updatePosition(id: string, dto: UpdatePositionDto) {
    if (!dto.performedByEmployeeId)
      throw new BadRequestException('performedByEmployeeId missing');

    const pos = await this.posModel.findById(id);
    if (!pos) throw new NotFoundException('Position not found.');

    const before = this.clean(pos.toObject());

    if (dto.departmentId) {
      const dept = await this.deptModel.findById(dto.departmentId);
      if (!dept || !dept.isActive) {
        throw new BadRequestException('Invalid departmentId.');
      }
    }

    if (dto.reportsToPositionId) {
      const manager = await this.posModel.findById(dto.reportsToPositionId);
      if (!manager) {
        throw new BadRequestException('reportsToPositionId does not exist.');
      }

      if (dto.reportsToPositionId === id) {
        throw new BadRequestException('Position cannot report to itself.');
      }

      if (
        await this.createsCircularReporting(id, dto.reportsToPositionId)
      ) {
        throw new BadRequestException(
          'Circular reporting line detected (REQ-OSM-09).',
        );
      }
    }

    await this.posModel.updateOne(
      { _id: new Types.ObjectId(id) },
      {
        $set: {
          ...dto,
          departmentId: dto.departmentId
            ? new Types.ObjectId(dto.departmentId)
            : pos.departmentId,
          reportsToPositionId: dto.reportsToPositionId
            ? new Types.ObjectId(dto.reportsToPositionId)
            : pos.reportsToPositionId,
        },
      },
    );

    const updated = await this.posModel.findById(id);
    if (!updated) {
      throw new NotFoundException('Position not found after update.');
    }

    await this.log({
      action: ChangeLogAction.UPDATED,
      entityType: 'Position',
      entityId: updated._id,
      before,
      after: updated.toObject(),
      summary: `Position ${updated.code} updated`,
      performedByEmployeeId: dto.performedByEmployeeId,
    });

    await this.notify('POSITION_UPDATED', updated);

    return updated;
  }

  async deactivatePosition(id: string, dto: DeactivatePositionDto) {
    if (!dto.performedByEmployeeId)
      throw new BadRequestException('performedByEmployeeId missing');

    const pos = await this.posModel.findById(id);
    if (!pos) throw new NotFoundException('Position not found.');

    if (!pos.isActive) return pos;

    const before = this.clean(pos.toObject());
    const closedAt = dto.closedAt ? new Date(dto.closedAt) : new Date();

    const assignments = await this.assignmentModel.find({
      positionId: pos._id,
      endDate: { $exists: false },
    });

    for (const a of assignments) {
      a.endDate = closedAt;
      if (dto.reason) (a as any).reason = dto.reason;
      if (dto.notes) (a as any).notes = dto.notes;
      await a.save();
    }

    await this.posModel.updateOne(
      { _id: pos._id },
      { $set: { isActive: false } },
    );

    const updated = await this.posModel.findById(pos._id);
    if (!updated) {
      throw new NotFoundException('Position not found after deactivation.');
    }

    await this.log({
      action: ChangeLogAction.DEACTIVATED,
      entityType: 'Position',
      entityId: updated._id,
      before,
      after: updated.toObject(),
      summary: `Position ${updated.code} deactivated`,
      performedByEmployeeId: dto.performedByEmployeeId,
    });

    await this.notify('POSITION_DEACTIVATED', updated);

    return updated;
  }

  async listPositions() {
    return this.posModel.find().lean();
  }

  async getPosition(id: string) {
    const pos = await this.posModel.findById(id).lean();
    if (!pos) throw new NotFoundException('Position not found.');
    return pos;
  }

  // ============================================================
  // TREE VIEW LOGIC
  // ============================================================

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
      department: d,
      rootPositions: [...posMap.values()].filter(
        (p) =>
          p.departmentId === d._id.toString() &&
          !p.reportsToPositionId,
      ),
    }));
  }

  async getEmployeeTree(employeeId: string) {
    const emp = await this.employeeModel.findById(employeeId);
    if (!emp) throw new NotFoundException('Employee not found.');

    const assignment = await this.assignmentModel.findOne({
      employeeId,
      endDate: { $exists: false },
    });

    if (!assignment) {
      throw new NotFoundException('Employee has no active position.');
    }

    const pos = await this.posModel.findById(assignment.positionId);
    if (!pos) throw new NotFoundException('Position not found.');

    return this.buildSubtree(pos._id.toString());
  }

  async getManagerTree(managerEmployeeId: string) {
    const manager = await this.employeeModel.findById(managerEmployeeId);
    if (!manager) throw new NotFoundException('Manager not found.');

    const assignment = await this.assignmentModel.findOne({
      employeeId: managerEmployeeId,
      endDate: { $exists: false },
    });

    if (!assignment) {
      throw new NotFoundException('Manager has no active position.');
    }

    const managerPos = await this.posModel.findById(assignment.positionId);
    if (!managerPos) throw new NotFoundException('Position not found.');

    return this.buildSubtree(managerPos._id.toString());
  }

  private async buildSubtree(rootId: string) {
    const positions = await this.posModel.find({ isActive: true }).lean();

    const posMap = new Map<string, any>();

    for (const p of positions) {
      posMap.set(p._id.toString(), {
        ...p,
        _id: p._id.toString(),
        reportsToPositionId: p.reportsToPositionId?.toString(),
        children: [],
      });
    }

    for (const p of posMap.values()) {
      if (p.reportsToPositionId && posMap.has(p.reportsToPositionId)) {
        posMap.get(p.reportsToPositionId).children.push(p);
      }
    }

    return posMap.get(rootId);
  }

  // ============================================================
  // CHANGE REQUEST WORKFLOW
  // ============================================================

  async createChangeRequest(dto: CreateStructureChangeRequestDto) {
    const emp = await this.employeeModel.findById(dto.requestedByEmployeeId);
    if (!emp) {
      throw new NotFoundException('requestedByEmployeeId does not exist.');
    }

    const requestNumber = dto.requestNumber ?? this.generateReqNumber();

    const created = await this.requestModel.create({
      requestNumber,
      requestType: dto.requestType,
      requestedByEmployeeId: new Types.ObjectId(dto.requestedByEmployeeId),
      targetDepartmentId: dto.targetDepartmentId
        ? new Types.ObjectId(dto.targetDepartmentId)
        : undefined,
      targetPositionId: dto.targetPositionId
        ? new Types.ObjectId(dto.targetPositionId)
        : undefined,
      details: dto.details ? JSON.stringify(dto.details) : undefined,
      reason: dto.reason,
      status: StructureRequestStatus.SUBMITTED,
      submittedAt: new Date(),
    });

    await this.log({
      action: ChangeLogAction.CREATED,
      entityType: 'StructureChangeRequest',
      entityId: created._id,
      after: created.toObject(),
      summary: `Change request ${requestNumber} created`,
      performedByEmployeeId: dto.requestedByEmployeeId,
    });

    return created;
  }

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

  async getChangeRequest(id: string) {
    const req = await this.requestModel.findById(id).lean();
    if (!req) throw new NotFoundException('Change request not found.');
    return req;
  }

  private async applyApproved(req: StructureChangeRequestDocument) {
    switch (req.requestType) {
      case StructureRequestType.UPDATE_POSITION:
        if (req.targetPositionId && req.details) {
          const data = JSON.parse(req.details);

          if (
            await this.createsCircularReporting(
              req.targetPositionId.toString(),
              data.reportsToPositionId,
            )
          ) {
            throw new BadRequestException(
              'Circular reporting line detected in approval.',
            );
          }

          await this.updatePosition(req.targetPositionId.toString(), data);
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

      case StructureRequestType.CLOSE_POSITION:
        if (req.targetPositionId) {
          await this.deactivatePosition(req.targetPositionId.toString(), {
            closedAt: new Date().toISOString(),
            reason: req.reason,
            performedByEmployeeId: undefined, // will be assigned in approveChangeRequest
          });
        }
        break;

      default:
        break;
    }
  }

  async approveChangeRequest(
    id: Types.ObjectId,
    dto: ApproveStructureChangeRequestDto,
  ) {
    if (!dto.approverEmployeeId)
      throw new BadRequestException('approverEmployeeId missing');

    const req = await this.requestModel.findById(id);
    if (!req) throw new NotFoundException('Request not found.');

    if (
      req.status === StructureRequestStatus.APPROVED ||
      req.status === StructureRequestStatus.REJECTED
    ) {
      throw new BadRequestException('Request already finalized.');
    }

    const before = this.clean(req.toObject());

    req.status = StructureRequestStatus.APPROVED;
    await req.save();

    await this.approvalModel.create({
      changeRequestId: req._id,
      approverEmployeeId: new Types.ObjectId(dto.approverEmployeeId),
      decision: ApprovalDecision.APPROVED,
      decidedAt: new Date(),
      comments: dto.comments,
    });

    await this.applyApproved(req);

    await this.log({
      action: ChangeLogAction.UPDATED,
      entityType: 'StructureChangeRequest',
      entityId: req._id,
      before,
      after: req.toObject(),
      summary: `Request ${req.requestNumber} approved`,
      performedByEmployeeId: dto.approverEmployeeId,
    });

    await this.notify('STRUCTURE_CHANGE_APPROVED', req);

    return req;
  }

  async rejectChangeRequest(
    id: Types.ObjectId,
    dto: RejectStructureChangeRequestDto,
  ) {
    if (!dto.approverEmployeeId)
      throw new BadRequestException('approverEmployeeId missing');

    const req = await this.requestModel.findById(id);
    if (!req) throw new NotFoundException('Request not found.');

    if (
      req.status === StructureRequestStatus.APPROVED ||
      req.status === StructureRequestStatus.REJECTED
    ) {
      throw new BadRequestException('Request already finalized.');
    }

    const before = this.clean(req.toObject());

    req.status = StructureRequestStatus.REJECTED;
    await req.save();

    await this.approvalModel.create({
      changeRequestId: req._id,
      approverEmployeeId: new Types.ObjectId(dto.approverEmployeeId),
      decision: ApprovalDecision.REJECTED,
      decidedAt: new Date(),
      comments: dto.comments,
    });

    await this.log({
      action: ChangeLogAction.UPDATED,
      entityType: 'StructureChangeRequest',
      entityId: req._id,
      before,
      after: req.toObject(),
      summary: `Request ${req.requestNumber} rejected`,
      performedByEmployeeId: dto.approverEmployeeId,
    });

    return req;
  }
}
