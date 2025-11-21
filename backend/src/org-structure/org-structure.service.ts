import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department, DepartmentDocument } from './schemas/department.schema';
import { Position, PositionDocument } from './schemas/position.schema';
import { CreateDepartmentDto } from './dto/create-dep.dto';
import { UpdateDepartmentDto } from './dto/update-dep.dto';
import { CreatePositionDto } from './dto/create-pos.dto';
import { UpdatePositionDto } from './dto/update-pos.dto';

export type PositionNode = {
  _id: string;
  title: string;
  departmentId: string | Types.ObjectId;
  reportsTo?: string | null;
  description?: string | null;
  isActive: boolean;
  isVacant: boolean;
  employeeAssigned?: string | null;
  payGrade?: number | null;
  closedDate?: Date | null;
  children: PositionNode[];
  [key: string]: any;
};

@Injectable()
export class OrgStructureService {
  constructor(
    @InjectModel(Department.name)
    private deptModel: Model<DepartmentDocument>,

    @InjectModel(Position.name)
    private posModel: Model<PositionDocument>,
  ) {}

  // ----------------------------------------------------
  // DEPARTMENTS
  // ----------------------------------------------------

  async createDepartment(dto: CreateDepartmentDto) {
    const dept = new this.deptModel(dto);
    return await dept.save();
  }

  async getDepartments() {
    return this.deptModel.find().sort({ createdAt: 1 }).lean();
  }

  async getDepartment(id: string) {
    const doc = await this.deptModel.findById(id).lean();
    if (!doc) throw new NotFoundException('Department not found');
    return doc;
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto) {
    const updated = await this.deptModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!updated) throw new NotFoundException('Department not found');
    return updated;
  }

  async deactivateDepartment(id: string) {
  const updated = await this.deptModel.findByIdAndUpdate(
    id,
    {
      isActive: false,          // 👈 IMPORTANT: use 'active'
      closedDate: new Date(), // keep closedDate for history
    },
    { new: true },
  );

  if (!updated) {
    throw new NotFoundException('Department not found');
  }

  return updated;
}


  // ----------------------------------------------------
  // POSITIONS
  // ----------------------------------------------------

  async createPosition(dto: CreatePositionDto) {
    const pos = new this.posModel({
      ...dto,
      // new positions are active and usually vacant by default
      isActive: dto.hasOwnProperty('isActive') ? (dto as any).isActive : true,
      isVacant: true,
    });
    return await pos.save();
  }

  async getPositions() {
  return this.posModel.find().sort({ createdAt: 1 }).lean(); // 👈 removed populate
}


  async getPosition(id: string) {
    const doc = await this.posModel
      .findById(id)
      .populate('departmentId reportsTo')
      .lean();
    if (!doc) throw new NotFoundException('Position not found');
    return doc;
  }

  async updatePosition(id: string, dto: UpdatePositionDto) {
    const updated = await this.posModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!updated) throw new NotFoundException('Position not found');
    return updated;
  }

  async deactivatePosition(id: string) {
    const updated = await this.posModel.findByIdAndUpdate(
      id,
      {
        isActive: false,
        isVacant: false,
        closedDate: new Date(),
      },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Position not found');
    return updated;
  }

  // Recruitment use-case
  async markPositionFilled(id: string) {
    const updated = await this.posModel.findByIdAndUpdate(
      id,
      { isVacant: false },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Position not found');
    return updated;
  }

  async markPositionVacant(id: string) {
    const updated = await this.posModel.findByIdAndUpdate(
      id,
      { isVacant: true },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Position not found');
    return updated;
  }

  // ORG CHART TREE
  async getTree(): Promise<PositionNode[]> {
    const positions = await this.posModel.find().lean();

    const map = new Map<string, PositionNode>();

    // Convert _id and reportsTo to strings + initialize children
    positions.forEach((p: any) => {
      const idStr = p._id.toString();
      map.set(idStr, {
        ...p,
        _id: idStr,
        departmentId: p.departmentId,
        reportsTo: p.reportsTo ? p.reportsTo.toString() : null,
        children: [],
      });
    });

    const roots: PositionNode[] = [];

    positions.forEach((p: any) => {
      const node = map.get(p._id.toString())!;
      if (node.reportsTo) {
        const parent = map.get(node.reportsTo);
        if (parent) {
          parent.children.push(node);
        } else {
          // If reportsTo points to a missing node, treat as root
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}
