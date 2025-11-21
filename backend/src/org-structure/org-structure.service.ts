// src/org-structure/org-structure.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model,Types } from 'mongoose';
import { Department, DepartmentDocument } from './schemas/department.schema';
import { Position, PositionDocument } from './schemas/position.schema';
import { CreateDepartmentDto } from './dto/create-dep.dto';
import { UpdateDepartmentDto } from './dto/update-dep.dto';
import { CreatePositionDto } from './dto/create-pos.dto';
import { UpdatePositionDto } from './dto/update-pos.dto';

export type PositionNode = {
  _id: string;
  title?: string;
  departmentId?: string | Types.ObjectId;
  reportsTo?: string;
  isActive?: boolean;
  isVacant?: boolean;
  employeeAssigned?: string;
  payGrade?: string;
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
    return await new this.deptModel(dto).save();
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
      { isActive: false, closedDate: new Date() },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Department not found');
    return updated;
  }

  // ----------------------------------------------------
  // POSITIONS
  // ----------------------------------------------------

  async createPosition(dto: CreatePositionDto) {
    return await new this.posModel(dto).save();
  }

  async getPositions() {
    return this.posModel
      .find()
      .populate('departmentId reportsTo')
      .sort({ createdAt: 1 })
      .lean();
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
      { isActive: false, closedDate: new Date(), isVacant: false },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Position not found');
    return updated;
  }

  // Recruitment use-case
  async markPositionFilled(id: string) {
    return this.posModel.findByIdAndUpdate(id, { isVacant: false }, { new: true });
  }

  async markPositionVacant(id: string) {
    return this.posModel.findByIdAndUpdate(id, { isVacant: true }, { new: true });
  }

  // ORG CHART TREE
  async getTree(): Promise<PositionNode[]> {
    const positions = await this.posModel.find().lean();

    const map = new Map<string, PositionNode>();

    // Convert _id and reportsTo to strings
    positions.forEach((p) => {
      map.set(p._id.toString(), {
        ...p,
        _id: p._id.toString(),
        reportsTo: p.reportsTo?.toString(),
        children: [],
      });
    });

    const roots: PositionNode[] = [];

    positions.forEach((p) => {
      const node = map.get(p._id.toString())!;
      if (node.reportsTo) {
        const parent = map.get(node.reportsTo);
        if (parent) parent.children.push(node);
        else roots.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}