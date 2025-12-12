import {
  BadRequestException,
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
  SystemRole,
} from './enums/employee-profile.enums';
import { UpdateSelfServiceProfileDto } from './dto/update-self-service-profile.dto';
import { CreateEmployeeProfileChangeRequestDto } from './dto/create-change-request.dto';
import { ReviewChangeRequestDto } from './dto/review-change-request.dto';
import { UpdateEmployeeProfileByAdminDto } from './dto/update-employee-profile-admin.dto';
import { SetEmployeeSystemRolesDto } from './dto/set-system-roles.dto';

@Injectable()
export class EmployeeProfileService {
  constructor(
    @InjectModel(EmployeeProfile.name)
    private readonly employeeProfileModel: Model<EmployeeProfileDocument>,
    @InjectModel(EmployeeProfileChangeRequest.name)
    private readonly changeRequestModel: Model<EmployeeProfileChangeRequest>,
    @InjectModel(EmployeeSystemRole.name)
    private readonly employeeSystemRoleModel: Model<EmployeeSystemRoleDocument>,
  ) {}

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

    // Only non-critical fields (BR 2g, 2n, 2o + biography, picture)
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

    // BR 22: changes are timestamped via mongoose timestamps
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
        requestDescription: dto.requestDescription, // <-- THE ONLY REQUIRED FIELD
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

  /**
   * Manager team brief: summary for direct reports
   * BR 41b – direct managers see their team only
   * We approximate by filtering on supervisorPositionId.
   */
  async getTeamBriefBySupervisorPosition(supervisorPositionId: string) {
    if (!Types.ObjectId.isValid(supervisorPositionId)) {
      throw new BadRequestException('Invalid supervisor position id');
    }

    const employees = await this.employeeProfileModel
      .find({
        supervisorPositionId: new Types.ObjectId(supervisorPositionId),
      })
      .select(
        'firstName lastName fullName employeeNumber dateOfHire status primaryPositionId primaryDepartmentId',
      )
      .populate('primaryPositionId')
      .populate('primaryDepartmentId')
      .exec();

    return employees;
  }

  // HR search (US-E6-03)
  async searchEmployees(query: string) {
    const regex = new RegExp(query, 'i');

    return this.employeeProfileModel
      .find({
        $or: [
          { firstName: regex },
          { lastName: regex },
          { fullName: regex },
          { employeeNumber: regex },
          { nationalId: regex },
        ],
      })
      .limit(50)
      .exec();
  }

  // ---------- Phase III: HR/Admin Processing & Master Data ----------

  async getPendingChangeRequests() {
    return this.changeRequestModel
      .find({ status: ProfileChangeStatus.PENDING })
      .sort({ submittedAt: 1 })
      .exec();
  }

  async reviewChangeRequest(
    requestId: string,
    dto: ReviewChangeRequestDto,
  ) {
    const request = await this.changeRequestModel
      .findOne({ requestId })
      .exec();

    if (!request) {
      throw new NotFoundException('Change request not found');
    }

    if (request.status !== ProfileChangeStatus.PENDING) {
      throw new BadRequestException('Change request already processed');
    }

    if (
      dto.decision !== ProfileChangeStatus.APPROVED &&
      dto.decision !== ProfileChangeStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Decision must be APPROVED or REJECTED',
      );
    }

    request.status = dto.decision;
    request.processedAt = new Date();

    // reuse reason field for HR comment
    if (dto.comment) {
      request.reason = dto.comment;
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

    // Basic PII & naming
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

    // Employment master data
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
      // BR 3j: status controls access – other subsystems read this flag
    }

    // Org structure links
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

    // Payroll link
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

    // Optionally: create a change request record marked as approved with the reason
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
      });
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

    // link back from employee profile to access profile if not set
    if (!employee.accessProfileId) {
      employee.accessProfileId = accessProfile._id;
      await employee.save();
    }

    return accessProfile;
  }
}
