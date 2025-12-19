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
} from './models/employee-profile.schema';
import {
  EmployeeProfileChangeRequest,
} from './models/ep-change-request.schema';
import {
  EmployeeSystemRole,
  EmployeeSystemRoleDocument,
} from './models/employee-system-role.schema';

import {
  EmployeeStatus,
  ProfileChangeStatus,
} from './enums/employee-profile.enums';

import { UpdateSelfServiceProfileDto } from './dto/update-self-service-profile.dto';
import { CreateEmployeeProfileChangeRequestDto } from './dto/create-change-request.dto';
import { ReviewChangeRequestDto } from './dto/review-change-request.dto';
import { UpdateEmployeeProfileByAdminDto } from './dto/update-employee-profile-admin.dto';
import { SetEmployeeSystemRolesDto } from './dto/set-system-roles.dto';
import { CreateEmployeeProfileDto } from './dto/create-employee-profile.dto';

@Injectable()
export class EmployeeProfileService {
  constructor(
    @InjectModel(EmployeeProfile.name)
    private readonly employeeProfileModel: Model<EmployeeProfileDocument>,

    @InjectModel(EmployeeProfileChangeRequest.name)
    private readonly changeRequestModel: Model<EmployeeProfileChangeRequest>,

    @InjectModel(EmployeeSystemRole.name)
    private readonly employeeSystemRoleModel: Model<EmployeeSystemRoleDocument>,
  ) { }

  // ---------- Admin: Create Employee Profile ----------

  async createEmployeeProfile(dto: CreateEmployeeProfileDto) {
    // Ensure employeeNumber is unique
    const existingByNumber = await this.employeeProfileModel
      .findOne({ employeeNumber: dto.employeeNumber })
      .exec();
    if (existingByNumber) {
      throw new ConflictException('Employee number already exists');
    }

    // Ensure nationalId is unique
    const existingByNationalId = await this.employeeProfileModel
      .findOne({ nationalId: dto.nationalId })
      .exec();
    if (existingByNationalId) {
      throw new ConflictException('National ID already exists');
    }

    const doc = new this.employeeProfileModel({
      // UserProfileBase
      firstName: dto.firstName,
      middleName: dto.middleName,
      lastName: dto.lastName,
      fullName: dto.fullName,
      nationalId: dto.nationalId,
      gender: dto.gender,
      maritalStatus: dto.maritalStatus,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      personalEmail: dto.personalEmail,
      mobilePhone: dto.mobilePhone,

      // EmployeeProfile
      employeeNumber: dto.employeeNumber,
      dateOfHire: new Date(dto.dateOfHire),
      workEmail: dto.workEmail,
      biography: dto.biography,
      contractStartDate: dto.contractStartDate
        ? new Date(dto.contractStartDate)
        : undefined,
      contractEndDate: dto.contractEndDate
        ? new Date(dto.contractEndDate)
        : undefined,
      contractType: dto.contractType,
      workType: dto.workType,
      status: dto.status ?? EmployeeStatus.ACTIVE,
      statusEffectiveFrom: new Date(),

      // Org Structure
      primaryPositionId: dto.primaryPositionId
        ? new Types.ObjectId(dto.primaryPositionId)
        : undefined,
      primaryDepartmentId: dto.primaryDepartmentId
        ? new Types.ObjectId(dto.primaryDepartmentId)
        : undefined,
      supervisorPositionId: dto.supervisorPositionId
        ? new Types.ObjectId(dto.supervisorPositionId)
        : undefined,

      // Payroll
      payGradeId: dto.payGradeId
        ? new Types.ObjectId(dto.payGradeId)
        : undefined,
    });

    const created = await doc.save();
    return created;
  }

  // ---------- Phase I: Self-Service ----------

  async getEmployeeProfileById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid employee profile id');
    }

    const profile = await this.employeeProfileModel
      .findById(id)
      .populate('primaryPositionId')
      .populate('primaryDepartmentId')
      .populate('payGradeId')
      .exec();

    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }

    return profile;
  }

  async updateSelfServiceProfile(
    employeeProfileId: string,
    dto: UpdateSelfServiceProfileDto,
  ) {
    if (!Types.ObjectId.isValid(employeeProfileId)) {
      throw new BadRequestException('Invalid employee profile id');
    }

    const profile = await this.employeeProfileModel
      .findById(employeeProfileId)
      .exec();

    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }

    // Only allowed self-service fields
    if (dto.personalEmail !== undefined) {
      profile.personalEmail = dto.personalEmail;
    }
    if (dto.mobilePhone !== undefined) {
      profile.mobilePhone = dto.mobilePhone;
    }
    if (dto.homePhone !== undefined) {
      profile.homePhone = dto.homePhone;
    }
    if (dto.address !== undefined) {
      profile.address = {
        ...(profile.address ?? {}),
        ...dto.address,
      };
    }
    if (dto.profilePictureUrl !== undefined) {
      profile.profilePictureUrl = dto.profilePictureUrl;
    }
    if (dto.biography !== undefined) {
      profile.biography = dto.biography;
    }

    const updated = await profile.save();
    return updated;
  }

  async createChangeRequest(
    employeeProfileId: string,
    dto: CreateEmployeeProfileChangeRequestDto,
  ) {
    if (!Types.ObjectId.isValid(employeeProfileId)) {
      throw new BadRequestException('Invalid employee profile id');
    }

    const employee = await this.employeeProfileModel
      .findById(employeeProfileId)
      .exec();

    if (!employee) {
      throw new NotFoundException('Employee profile not found');
    }

    const requestId = `EPCR-${Date.now()}`;

    const changeRequest = await this.changeRequestModel.create({
      requestId,
      employeeProfileId: employee._id,
      requestDescription: dto.requestDescription, // ✅ store the description blob
      status: ProfileChangeStatus.PENDING,
      submittedAt: new Date(),
    });

    return changeRequest;
  }

  async getMyChangeRequests(employeeProfileId: string) {
    if (!Types.ObjectId.isValid(employeeProfileId)) {
      throw new BadRequestException('Invalid employee profile id');
    }

    return this.changeRequestModel
      .find({ employeeProfileId: new Types.ObjectId(employeeProfileId) })
      .sort({ submittedAt: -1 })
      .exec();
  }

  // ---------- Phase II: Manager Insight ----------

  async getTeamBriefBySupervisorPosition(
    managerPositionId: string,
    managerDepartmentId?: string,
    managerEmployeeId?: string,
  ) {
    if (!Types.ObjectId.isValid(managerPositionId)) {
      throw new BadRequestException('Invalid manager position id');
    }

    console.log('🔍 getTeamBriefBySupervisorPosition called with:', {
      managerPositionId,
      managerDepartmentId,
      managerEmployeeId,
    });

    // Find all employees and populate their position to check reportsToPositionId
    const allEmployees = await this.employeeProfileModel
      .find({})
      .select(
        'firstName lastName fullName employeeNumber dateOfHire status primaryPositionId primaryDepartmentId supervisorPositionId',
      )
      .populate('primaryPositionId')
      .populate('primaryDepartmentId')
      .lean()
      .exec();

    console.log('📊 Total employees found:', allEmployees.length);

    const managerPosId = managerPositionId;

    // Filter employees whose position reports to the manager's position
    // Check both: position.reportsToPositionId AND employee.supervisorPositionId
    const directReports = allEmployees.filter((emp: any) => {
      // Exclude the manager themselves
      if (emp._id?.toString() === managerEmployeeId) {
        return false;
      }

      // Check if employee's position reports to manager's position
      const posReportsTo = emp.primaryPositionId?.reportsToPositionId?.toString();
      if (posReportsTo === managerPosId) {
        return true;
      }

      // Also check employee's direct supervisorPositionId field
      const empSupervisor = emp.supervisorPositionId?.toString();
      if (empSupervisor === managerPosId) {
        return true;
      }

      return false;
    });

    console.log('👥 Direct reports found via position hierarchy:', directReports.length);

    // If no position-based matches found, fallback to department-based matching
    if (directReports.length === 0 && managerDepartmentId) {
      console.log('🔄 No position-based matches, trying department fallback...');

      const departmentTeam = allEmployees.filter((emp: any) => {
        // Exclude the manager themselves
        if (emp._id?.toString() === managerEmployeeId) {
          return false;
        }

        // Check if employee is in the same department
        const empDeptId = emp.primaryDepartmentId?._id?.toString() || emp.primaryDepartmentId?.toString();
        return empDeptId === managerDepartmentId;
      });

      console.log('👥 Department-based team found:', departmentTeam.length);
      return departmentTeam;
    }

    return directReports;
  }

// In employee-profile.service.ts
// Find this function and update it:

async searchEmployees(query: string) {
  const regex = new RegExp(query, 'i');

  const employees = await this.employeeProfileModel
    .find({
      $or: [
        { firstName: regex },
        { lastName: regex },
        { fullName: regex },
        { employeeNumber: regex },
        { nationalId: regex },
        { workEmail: regex },
      ],
    })
    .select(
      'firstName lastName fullName employeeNumber workEmail status profilePictureUrl ' +
      'primaryDepartmentId primaryPositionId supervisorPositionId'  // ← ADDED supervisorPositionId
    )
    .populate('primaryDepartmentId', 'name')
    .populate('primaryPositionId', 'title')
    .limit(100)
    .lean()
    .exec();

  const employeeIds = employees.map((e) => e._id);
  const systemRoles = await this.employeeSystemRoleModel
    .find({ employeeProfileId: { $in: employeeIds } })
    .lean()
    .exec();

  const rolesMap = new Map<string, string[]>();
  for (const sr of systemRoles) {
    rolesMap.set(sr.employeeProfileId.toString(), sr.roles || []);
  }

  return employees.map((emp: any) => ({
    _id: emp._id.toString(),
    firstName: emp.firstName,
    lastName: emp.lastName,
    fullName: emp.fullName,
    employeeNumber: emp.employeeNumber,
    workEmail: emp.workEmail,
    status: emp.status,
    departmentName: emp.primaryDepartmentId?.name || null,
    positionTitle: emp.primaryPositionId?.title || null,
    systemRoles: rolesMap.get(emp._id.toString()) || [],
    profilePictureUrl: emp.profilePictureUrl,
    primaryDepartmentId: emp.primaryDepartmentId?._id || null,
    primaryPositionId: emp.primaryPositionId?._id || null,
    supervisorPositionId: emp.supervisorPositionId || null,  // ← ADDED to return value
  }));
}  // ---------- Phase III: HR/Admin Processing & Master Data ----------

  async getPendingChangeRequests() {
    // still used by /employee-profile/admin/change-requests/pending
    const requests = await this.changeRequestModel
      .find({ status: ProfileChangeStatus.PENDING })
      .populate('employeeProfileId', 'firstName lastName employeeNumber')
      .sort({ submittedAt: 1 })
      .exec();

    return Promise.all(
      requests.map(async (req) => {
        let emp = req.employeeProfileId as any;

        // Fallback: if populate failed, emp might be just the ID or null
        // We try to fetch it manually to be sure.
        if ((!emp || !emp.firstName) && emp) {
          try {
            const empId = emp._id || emp;
            const found = await this.employeeProfileModel
              .findById(empId)
              .select('firstName lastName employeeNumber');
            if (found) {
              emp = found;
            }
          } catch (err) {
            console.warn('Failed to manual lookup employee for request', req._id);
          }
        }

        return {
          ...req.toObject(),
          employeeProfileId: emp?._id ? emp._id.toString() : emp?.toString(),
          employeeName: emp?.firstName
            ? `${emp.firstName} ${emp.lastName}`
            : 'Unknown employee',
          employeeNumber: emp?.employeeNumber,
        };
      }),
    );
  }

  async reviewChangeRequest(
    requestId: string,
    dto: ReviewChangeRequestDto,
  ) {
    // 🔍 Try by business requestId (EPCR-...) first
    let request = await this.changeRequestModel
      .findOne({ requestId })
      .exec();

    // 🔁 If that fails and it looks like an ObjectId, try _id
    if (!request && Types.ObjectId.isValid(requestId)) {
      request = await this.changeRequestModel.findById(requestId).exec();
    }

    if (!request) {
      throw new NotFoundException('Change request not found');
    }

    if (request.status !== ProfileChangeStatus.PENDING) {
      throw new BadRequestException('Change request already processed');
    }

    // 💡 Accept both { decision } and { status } from body
    const decision: ProfileChangeStatus =
      (dto as any).decision ?? (dto as any).status;

    if (
      decision !== ProfileChangeStatus.APPROVED &&
      decision !== ProfileChangeStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Decision must be APPROVED or REJECTED',
      );
    }

    // ✅ If APPROVED, apply the change to the employee profile
    if (decision === ProfileChangeStatus.APPROVED) {
      const employee = await this.employeeProfileModel
        .findById(request.employeeProfileId)
        .exec();

      if (!employee) {
        throw new NotFoundException(
          'Employee profile not found for this request',
        );
      }

      const parsed = this.parseRequestDescription(
        (request as any).requestDescription,
      );

      const fieldName = parsed.fieldName?.toLowerCase();
      const newValue = parsed.requestedValue;

      if (fieldName && newValue) {
        // 🔁 Map human label → actual EmployeeProfile property

        // Email
        if (fieldName.includes('personal email')) {
          (employee as any).personalEmail = newValue;
        } else if (fieldName.includes('work email')) {
          employee.workEmail = newValue;
        } else if (fieldName.includes('email')) {
          // generic "Email"
          (employee as any).personalEmail = newValue;
        }

        // Phone
        else if (fieldName.includes('home phone')) {
          (employee as any).homePhone = newValue;
        } else if (
          fieldName.includes('mobile') ||
          fieldName.includes('phone')
        ) {
          employee.mobilePhone = newValue;
        }

        // Bank details
        else if (fieldName.includes('bank name')) {
          (employee as any).bankName = newValue;
        } else if (
          fieldName.includes('bank account') ||
          fieldName.includes('iban')
        ) {
          (employee as any).bankAccountNumber = newValue;
        }

        // Address (simple: put in line1)
        else if (fieldName.includes('address')) {
          (employee as any).address = {
            ...(employee as any).address,
            line1: newValue,
          };
        }

        // Biography
        else if (fieldName.includes('bio')) {
          employee.biography = newValue;
        }

        // you can add more mappings later if needed

        await employee.save();
      }
    }

    // 💬 Accept both { comment } and { reviewComment }
    const comment =
      (dto as any).comment ?? (dto as any).reviewComment;

    // ✅ Always update request status + audit data
    request.status = decision;
    request.processedAt = new Date();

    if (comment) {
      request.reason = comment;
    }

    await request.save();
    return request;
  }

  async updateEmployeeProfileAsAdmin(
    employeeProfileId: string,
    dto: UpdateEmployeeProfileByAdminDto,
  ) {
    if (!Types.ObjectId.isValid(employeeProfileId)) {
      throw new BadRequestException('Invalid employee profile id');
    }

    const profile = await this.employeeProfileModel
      .findById(employeeProfileId)
      .exec();

    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }

    // Basic PII & names
    if (dto.firstName !== undefined) profile.firstName = dto.firstName;
    if (dto.middleName !== undefined) profile.middleName = dto.middleName;
    if (dto.lastName !== undefined) profile.lastName = dto.lastName;
    if (dto.fullName !== undefined) profile.fullName = dto.fullName;
    if (dto.nationalId !== undefined) profile.nationalId = dto.nationalId;

    // Demographics
    if (dto.gender !== undefined) profile.gender = dto.gender;
    if (dto.maritalStatus !== undefined)
      profile.maritalStatus = dto.maritalStatus;
    if (dto.dateOfBirth !== undefined)
      profile.dateOfBirth = new Date(dto.dateOfBirth);

    // Contact
    if (dto.personalEmail !== undefined)
      profile.personalEmail = dto.personalEmail;
    if (dto.mobilePhone !== undefined) profile.mobilePhone = dto.mobilePhone;
    if (dto.homePhone !== undefined) profile.homePhone = dto.homePhone;
    if (dto.profilePictureUrl !== undefined)
      profile.profilePictureUrl = dto.profilePictureUrl;

    // Employment
    if (dto.employeeNumber !== undefined)
      profile.employeeNumber = dto.employeeNumber;
    if (dto.dateOfHire !== undefined)
      profile.dateOfHire = new Date(dto.dateOfHire);
    if (dto.workEmail !== undefined) profile.workEmail = dto.workEmail;
    if (dto.biography !== undefined) profile.biography = dto.biography;

    if (dto.contractStartDate !== undefined)
      profile.contractStartDate = new Date(dto.contractStartDate);
    if (dto.contractEndDate !== undefined)
      profile.contractEndDate = new Date(dto.contractEndDate);
    if (dto.contractType !== undefined)
      profile.contractType = dto.contractType;
    if (dto.workType !== undefined) profile.workType = dto.workType;

    if (dto.status !== undefined) {
      profile.status = dto.status;
      profile.statusEffectiveFrom =
        dto.statusEffectiveFrom !== undefined
          ? new Date(dto.statusEffectiveFrom)
          : new Date();
    }

    // Org structure
    if (dto.primaryPositionId !== undefined)
      profile.primaryPositionId = new Types.ObjectId(dto.primaryPositionId);
    if (dto.primaryDepartmentId !== undefined)
      profile.primaryDepartmentId = new Types.ObjectId(
        dto.primaryDepartmentId,
      );
    if (dto.supervisorPositionId !== undefined)
      profile.supervisorPositionId = new Types.ObjectId(
        dto.supervisorPositionId,
      );

    // Payroll
    if (dto.payGradeId !== undefined)
      profile.payGradeId = new Types.ObjectId(dto.payGradeId);

    const updated = await profile.save();
    return updated;
  }

  async deactivateEmployeeProfile(
    employeeProfileId: string,
    reason?: string,
  ) {
    const updated = await this.updateEmployeeProfileAsAdmin(
      employeeProfileId,
      {
        status: EmployeeStatus.TERMINATED,
        statusEffectiveFrom: new Date().toISOString(),
      },
    );

    if (reason) {
      await this.changeRequestModel.create({
        requestId: `EPCR-TERMINATE-${Date.now()}`,
        employeeProfileId: new Types.ObjectId(employeeProfileId),
        fieldName: 'Employment Status',
        currentValue: 'ACTIVE',
        requestedValue: 'TERMINATED',
        reason,
        status: ProfileChangeStatus.APPROVED,
        submittedAt: new Date(),
        processedAt: new Date(),
      } as any);
    }

    return updated;
  }

  // ---------- System Roles ----------

  async setEmployeeSystemRoles(
    employeeProfileId: string,
    dto: SetEmployeeSystemRolesDto,
  ) {
    if (!Types.ObjectId.isValid(employeeProfileId)) {
      throw new BadRequestException('Invalid employee profile id');
    }

    const employee = await this.employeeProfileModel
      .findById(employeeProfileId)
      .exec();

    if (!employee) {
      throw new NotFoundException('Employee profile not found');
    }

    const employeeObjectId = new Types.ObjectId(employeeProfileId);

    let accessProfile = await this.employeeSystemRoleModel
      .findOne({ employeeProfileId: employeeObjectId })
      .exec();

    if (!accessProfile) {
      accessProfile = await this.employeeSystemRoleModel.create({
        employeeProfileId: employeeObjectId,
        roles: dto.roles ?? [],
        permissions: dto.permissions ?? [],
        isActive: true,
      });
    } else {
      accessProfile.roles = dto.roles ?? [];
      accessProfile.permissions = dto.permissions ?? [];
      accessProfile.isActive = true;
      await accessProfile.save();
    }

    if (!employee.accessProfileId) {
      employee.accessProfileId = accessProfile._id;
      await employee.save();
    }

    return accessProfile;
  }

  // ---------- Profile Picture Upload ----------

  async updateProfilePicture(employeeProfileId: string, fileUrl: string) {
    if (!Types.ObjectId.isValid(employeeProfileId)) {
      throw new BadRequestException('Invalid employee profile id');
    }

    const employee = await this.employeeProfileModel
      .findById(employeeProfileId)
      .exec();

    if (!employee) {
      throw new NotFoundException('Employee profile not found');
    }

    // Delete old file if it exists and is a local file
    if (
      employee.profilePictureUrl &&
      employee.profilePictureUrl.startsWith('/uploads/')
    ) {
      try {
        // Assuming uploads is in the project root, and we are in dist/src/...
        // or src/...
        // Better to use process.cwd()
        const fs = require('fs');
        const path = require('path');
        const oldPath = path.join(process.cwd(), employee.profilePictureUrl);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      } catch (err) {
        console.warn('Failed to delete old profile picture:', err);
      }
    }

    employee.profilePictureUrl = fileUrl;
    await employee.save();

    return employee;
  }

  // ---------- helpers ----------




  private parseRequestDescription(desc?: string) {
    if (!desc) {
      return {
        fieldName: undefined,
        currentValue: undefined,
        requestedValue: undefined,
        reason: undefined,
      };
    }

    const lines = desc
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const get = (label: string) => {
      const line = lines.find((l) => l.startsWith(label));
      return line ? line.slice(label.length).trim() : undefined;
    };

    return {
      fieldName: get('Field:'),
      currentValue: get('From:'),
      requestedValue: get('To:'),
      reason: get('Reason:'),
    };
  }
}
