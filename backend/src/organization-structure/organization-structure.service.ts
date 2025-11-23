import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { model, Types } from 'mongoose';

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
  StructureApproval,
  StructureApprovalDocument,
} from './models/structure-approval.schema';
import {
  StructureChangeLog,
  StructureChangeLogDocument,
} from './models/structure-change-log.schema';
import {
  StructureChangeRequest,
  StructureChangeRequestDocument,
} from './models/structure-change-request.schema';

import {
  ChangeLogAction,
  StructureRequestStatus,
  StructureRequestType,
  ApprovalDecision,
} from './enums/organization-structure.enums';

import { CreateDepartmentDto } from './DTOs/create-department.dto';
import { UpdateDepartmentDto } from './DTOs/update-department.dto';
import { CreatePositionDto } from './DTOs/create-position.dto';
import { UpdatePositionDto } from './DTOs/update-position.dto';
import { DeactivatePositionDto } from './DTOs/deactivate-position.dto.tsdeactivate-position.dto';
import { CreateStructureChangeRequestDto } from './DTOs/create-structure-change-request.dto';
import { ApproveStructureChangeRequestDto } from './DTOs/approve-structure-change-request.dto';
import { RejectStructureChangeRequestDto } from './DTOs/reject-structure-change-request.dto';

type ObjectId = Types.ObjectId;

export interface OrgTreePositionNode {
  _id: string;
  code: string;
  title: string;
  description?: string;
  departmentId: string;
  departmentName?: string;
  reportsToPositionId?: string;
  children: OrgTreePositionNode[];
}

@Injectable()
export class OrganizationStructureService {
  private readonly departmentModel = model<DepartmentDocument>(Department.name);
  private readonly positionModel = model<PositionDocument>(Position.name);
  private readonly assignmentModel =
    model<PositionAssignmentDocument>(PositionAssignment.name);
  private readonly changeRequestModel =
    model<StructureChangeRequestDocument>(StructureChangeRequest.name);
  private readonly approvalModel =
    model<StructureApprovalDocument>(StructureApproval.name);
  private readonly changeLogModel =
    model<StructureChangeLogDocument>(StructureChangeLog.name);

  // =============== Departments ===============

  async createDepartment(dto: CreateDepartmentDto) {
    const existing = await this.departmentModel
      .findOne({ code: dto.code })
      .lean()
      .exec();

    if (existing) {
      throw new ConflictException('Department code must be unique.');
    }

    const department = await this.departmentModel.create({
      code: dto.code,
      name: dto.name,
      description: dto.description,
      isActive: true,
    });

    await this.logChange(
      ChangeLogAction.CREATED,
      'Department',
      department._id,
      dto.performedByEmployeeId,
      null,
      department.toObject(),
    );

    return department;
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto) {
    const department = await this.departmentModel.findById(id).exec();
    if (!department) {
      throw new NotFoundException('Department not found.');
    }

    const before = department.toObject();

    if (typeof dto.name === 'string') {
      department.name = dto.name;
    }
    if (typeof dto.description === 'string') {
      department.description = dto.description;
    }
    if (typeof dto.isActive === 'boolean') {
      department.isActive = dto.isActive;
    }

    const after = (await department.save()).toObject();

    await this.logChange(
      ChangeLogAction.UPDATED,
      'Department',
      department._id,
      dto.performedByEmployeeId,
      before,
      after,
    );

    return after;
  }

  // =============== Positions ===============

  async createPosition(dto: CreatePositionDto) {
    const existing = await this.positionModel
      .findOne({ code: dto.code })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException('Position code must be unique.');
    }

    const department = await this.departmentModel
      .findById(dto.departmentId)
      .exec();
    if (!department) {
      throw new BadRequestException('Invalid departmentId.');
    }

    // Optional validation: if reportsToPositionId is given, ensure it exists
    let reportsTo: ObjectId | undefined;
    if (dto.reportsToPositionId) {
      const manager = await this.positionModel
        .findById(dto.reportsToPositionId)
        .exec();
      if (!manager) {
        throw new BadRequestException('Invalid reportsToPositionId.');
      }
      reportsTo = manager._id;
    }

    const position = await this.positionModel.create({
      code: dto.code,
      title: dto.title,
      description: dto.description,
      departmentId: department._id,
      reportsToPositionId: reportsTo,
      isActive: true,
    });

    await this.logChange(
      ChangeLogAction.CREATED,
      'Position',
      position._id,
      dto.performedByEmployeeId,
      null,
      position.toObject(),
    );

    return position;
  }

  async updatePosition(id: string, dto: UpdatePositionDto) {
    const position = await this.positionModel.findById(id).exec();
    if (!position) {
      throw new NotFoundException('Position not found.');
    }

    const before = position.toObject();

    if (typeof dto.title === 'string') {
      position.title = dto.title;
    }
    if (typeof dto.description === 'string') {
      position.description = dto.description;
    }
    if (typeof dto.isActive === 'boolean') {
      position.isActive = dto.isActive;
    }

    if (dto.departmentId) {
      const department = await this.departmentModel
        .findById(dto.departmentId)
        .exec();
      if (!department) {
        throw new BadRequestException('Invalid departmentId.');
      }
      position.departmentId = department._id as ObjectId;
    }

    if (dto.reportsToPositionId) {
      const manager = await this.positionModel
        .findById(dto.reportsToPositionId)
        .exec();
      if (!manager) {
        throw new BadRequestException('Invalid reportsToPositionId.');
      }

      // circular reporting validation (REQ-OSM-09) :contentReference[oaicite:7]{index=7}
      const willBeManagerOf = position._id.toString();
      const createsCycle = await this.detectCircularReporting(
        manager._id,
        willBeManagerOf,
      );
      if (createsCycle) {
        throw new BadRequestException(
          'Circular reporting line detected. Change rejected.',
        );
      }

      position.reportsToPositionId = manager._id;
    }

    const after = (await position.save()).toObject();

    await this.logChange(
      ChangeLogAction.UPDATED,
      'Position',
      position._id,
      dto.performedByEmployeeId,
      before,
      after,
    );

    return after;
  }

  /**
   * Deactivate / delimit a position (REQ-OSM-05, BR 12, BR 37). :contentReference[oaicite:8]{index=8} :contentReference[oaicite:9]{index=9}
   */
  async deactivatePosition(id: string, dto: DeactivatePositionDto) {
    const position = await this.positionModel.findById(id).exec();
    if (!position) {
      throw new NotFoundException('Position not found.');
    }

    const before = position.toObject();

    // Mark position as inactive (we keep it for history – no delete)
    position.isActive = false;

    // Delimit open assignments by setting endDate to closedAt
    const closedAt = new Date(dto.closedAt);

    await this.assignmentModel.updateMany(
      {
        positionId: position._id,
        endDate: { $exists: false },
      },
      {
        $set: {
          endDate: closedAt,
          notes: dto.notes,
          reason: dto.reason,
        },
      },
    );

    const after = (await position.save()).toObject();

    await this.logChange(
      ChangeLogAction.DEACTIVATED,
      'Position',
      position._id,
      dto.performedByEmployeeId,
      before,
      after,
    );

    return after;
  }

  // =============== Org Tree (for visibility / graphical chart) ===============

  /**
   * Returns a simplified org tree of positions grouped by reporting lines and department.
   * Supports REQ-SANV-01/02 + BR 24 (graphical org chart backend). :contentReference[oaicite:10]{index=10}
   */
  async getOrgTree(): Promise<OrgTreePositionNode[]> {
    const [departments, positions] = await Promise.all([
      this.departmentModel.find({ isActive: true }).lean().exec(),
      this.positionModel.find({ isActive: true }).lean().exec(),
    ]);

    const departmentMap = new Map<string, string>();
    departments.forEach((d) => {
      departmentMap.set(d._id.toString(), d.name);
    });

    const nodeMap = new Map<string, OrgTreePositionNode>();
    const roots: OrgTreePositionNode[] = [];

    // Initialize nodes
    positions.forEach((p) => {
      nodeMap.set(p._id.toString(), {
        _id: p._id.toString(),
        code: p.code,
        title: p.title,
        description: p.description,
        departmentId: p.departmentId.toString(),
        departmentName: departmentMap.get(p.departmentId.toString()),
        reportsToPositionId: p.reportsToPositionId
          ? p.reportsToPositionId.toString()
          : undefined,
        children: [],
      });
    });

    // Link children to managers
    nodeMap.forEach((node) => {
      if (node.reportsToPositionId) {
        const manager = nodeMap.get(node.reportsToPositionId);
        if (manager) {
          manager.children.push(node);
          return;
        }
      }
      // no manager → root node
      roots.push(node);
    });

    return roots;
  }

  // =============== Structure Change Requests & Approvals ===============

  /**
   * Manager submits a structural change request (REQ-OSM-03). :contentReference[oaicite:11]{index=11}
   */
  async createChangeRequest(dto: CreateStructureChangeRequestDto) {
    let requestNumber = dto.requestNumber;
    if (!requestNumber) {
      // Simple timestamp-based request number for demo purposes
      requestNumber = `OSR-${Date.now()}`;
    }

    const changeRequest = await this.changeRequestModel.create({
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

    return changeRequest;
  }

  async getPendingChangeRequests() {
    return this.changeRequestModel
      .find({
        status: {
          $in: [
            StructureRequestStatus.SUBMITTED,
            StructureRequestStatus.UNDER_REVIEW,
          ],
        },
      })
      .lean()
      .exec();
  }

  /**
   * System Admin approves a structural change request (REQ-OSM-04). :contentReference[oaicite:12]{index=12}
   */
  async approveChangeRequest(
    id: string,
    dto: ApproveStructureChangeRequestDto,
  ) {
    const request = await this.changeRequestModel.findById(id).exec();
    if (!request) {
      throw new NotFoundException('Change request not found.');
    }

    if (
      request.status === StructureRequestStatus.APPROVED ||
      request.status === StructureRequestStatus.REJECTED
    ) {
      throw new BadRequestException('Request already finalized.');
    }

    request.status = StructureRequestStatus.APPROVED;
    await request.save();

    await this.approvalModel.create({
      changeRequestId: request._id,
      approverEmployeeId: new Types.ObjectId(dto.approverEmployeeId),
      decision: ApprovalDecision.APPROVED,
      decidedAt: new Date(),
      comments: dto.comments,
    });

    return request;
  }

  async rejectChangeRequest(
    id: string,
    dto: RejectStructureChangeRequestDto,
  ) {
    const request = await this.changeRequestModel.findById(id).exec();
    if (!request) {
      throw new NotFoundException('Change request not found.');
    }

    if (
      request.status === StructureRequestStatus.APPROVED ||
      request.status === StructureRequestStatus.REJECTED
    ) {
      throw new BadRequestException('Request already finalized.');
    }

    request.status = StructureRequestStatus.REJECTED;
    await request.save();

    await this.approvalModel.create({
      changeRequestId: request._id,
      approverEmployeeId: new Types.ObjectId(dto.approverEmployeeId),
      decision: ApprovalDecision.REJECTED,
      decidedAt: new Date(),
      comments: dto.comments,
    });

    return request;
  }

  // =============== Helpers ===============

  private async logChange(
    action: ChangeLogAction,
    entityType: string,
    entityId: ObjectId,
    performedByEmployeeId?: string,
    beforeSnapshot?: any,  // relaxed type
    afterSnapshot?: any,   // relaxed type
) {
  await this.changeLogModel.create({
    action,
    entityType,
    entityId,
    performedByEmployeeId: performedByEmployeeId
      ? new Types.ObjectId(performedByEmployeeId)
      : undefined,
    beforeSnapshot: beforeSnapshot ?? undefined,
    afterSnapshot: afterSnapshot ?? undefined,
  });
}


  /**
   * Detects if assigning managerId as the manager of childId would create a cycle.
   */
  private async detectCircularReporting(
    managerId: ObjectId,
    childId: string,
  ): Promise<boolean> {
    let current: PositionDocument | null = await this.positionModel
      .findById(managerId)
      .exec();

    while (current) {
      if (current._id.toString() === childId) {
        return true;
      }
      if (!current.reportsToPositionId) break;
      current = await this.positionModel
        .findById(current.reportsToPositionId)
        .exec();
    }

    return false;
  }
}
