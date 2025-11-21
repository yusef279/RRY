import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Employee, EmployeeDocument } from './schemas/employee.schema';
import {
  ProfileChangeRequest,
  ProfileChangeRequestDocument,
} from './schemas/profile-change-request.schema';

import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateProfileChangeRequestDto } from './dto/create-profile-change.dto';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectModel('Employee')
    private employeeModel: Model<EmployeeDocument>,

    @InjectModel('ProfileChangeRequest')
    private profileChangeModel: Model<ProfileChangeRequestDocument>,
  ) {}

  // ===============================
  // EMPLOYEE CRUD
  // ===============================

  async create(dto: CreateEmployeeDto) {
    const exists = await this.employeeModel.findOne({ email: dto.email });
    if (exists) {
      throw new BadRequestException('Employee with this email already exists');
    }
    const emp = new this.employeeModel(dto);
    return emp.save();
  }

  async findAll() {
    return this.employeeModel.find().lean();
  }

  async findOne(id: string) {
    const emp = await this.employeeModel.findById(id).lean();
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const emp = await this.employeeModel.findById(id);
    if (!emp) throw new NotFoundException('Employee not found');

    Object.assign(emp, dto);
    return emp.save();
  }

  async findByEmail(email: string) {
    const emp = await this.employeeModel.findOne({ email }).lean();
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  // ===============================
  // EMPLOYEE PROFILE CHANGE REQUEST (Employee-Side)
  // ===============================

  async requestProfileChange(dto: CreateProfileChangeRequestDto) {
    const employee = await this.employeeModel.findById(dto.employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    const req = new this.profileChangeModel({
      employeeId: dto.employeeId,
      changes: dto.changes,
      reason: dto.reason,
      status: 'PENDING',
    });

    return req.save();
  }

  // ===============================
  // HR — LIST REQUESTS
  // ===============================

  async listProfileChangeRequests(status?: string, employeeId?: string) {
    const filter: any = {};

    if (status) {
      const upper = status.toUpperCase();
      if (!['PENDING', 'APPROVED', 'REJECTED'].includes(upper)) {
        throw new BadRequestException(
          'Status must be one of: PENDING, APPROVED, REJECTED',
        );
      }
      filter.status = upper;
    }

    if (employeeId && employeeId !== 'null' && employeeId !== 'undefined' && employeeId.trim() !== '') {
      filter.employeeId = employeeId;
    }

    return this.profileChangeModel
      .find(filter)
      .populate('employeeId')
      .lean();
  }

  // ===============================
  // HR — VIEW SINGLE REQUEST
  // ===============================

  async getProfileChangeRequest(id: string) {
    const req = await this.profileChangeModel
      .findById(id)
      .populate('employeeId')
      .lean();

    if (!req) throw new NotFoundException('Profile change request not found');

    return req;
  }

  // ===============================
  // HR — APPROVE REQUEST
  // ===============================

  async approveProfileChangeRequest(id: string) {
    const req = await this.profileChangeModel.findById(id);
    if (!req) throw new NotFoundException('Profile change request not found');

    if (req.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING requests can be approved');
    }

    const employee = await this.employeeModel.findById(req.employeeId);
    if (!employee) {
      throw new NotFoundException('Employee not found for this request');
    }

    // Apply the changes to the employee
    const changes = req.changes || {};
    Object.keys(changes).forEach((field) => {
      const fieldChange = changes[field];
      (employee as any)[field] = fieldChange.newValue;
    });

    await employee.save();

    req.status = 'APPROVED';
    await req.save();

    return {
      message: 'Profile change request approved',
      request: req,
      updatedEmployee: employee,
    };
  }

  // ===============================
  // HR — REJECT REQUEST
  // ===============================

  async rejectProfileChangeRequest(id: string) {
    const req = await this.profileChangeModel.findById(id);
    if (!req) throw new NotFoundException('Profile change request not found');

    if (req.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING requests can be rejected');
    }

    req.status = 'REJECTED';
    await req.save();

    return {
      message: 'Profile change request rejected',
      request: req,
    };
  }
}
