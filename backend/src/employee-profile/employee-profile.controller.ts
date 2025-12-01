// src/employee-profile/employee-profile.controller.ts
import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

import { EmployeeProfileService } from './employee-profile.service';
import { UpdateSelfServiceProfileDto } from './dto/update-self-service-profile.dto';
import { CreateEmployeeProfileChangeRequestDto } from './dto/create-change-request.dto';
import { ReviewChangeRequestDto } from './dto/review-change-request.dto';
import { UpdateEmployeeProfileByAdminDto } from './dto/update-employee-profile-admin.dto';
import { SetEmployeeSystemRolesDto } from './dto/set-system-roles.dto';
import { CreateEmployeeProfileDto } from './dto/create-employee-profile.dto';

// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
import { Permissions } from '../auth/decorators/roles.decorators';
import { Permission,UserRole } from '../auth/permissions.constant';
import { AuthUser } from '../auth/auth-user.interface';

@Controller('employee-profile')
//@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeeProfileController {
  constructor(private readonly employeeProfileService: EmployeeProfileService) {}

  /* ---------- Admin: Create Employee ---------- */
  @Post('admin')
  @Permissions(Permission.MANAGE_ALL_PROFILES)
  createEmployeeProfile(@Body() dto: CreateEmployeeProfileDto) {
    return this.employeeProfileService.createEmployeeProfile(dto);
  }

  /* ---------- Phase I: Self-Service ---------- */
  @Get(':id')
  @Permissions(Permission.EDIT_OWN_PROFILE) // minimal permission – owner scoping below
  getEmployeeProfile(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    if (req.user.employeeId !== id && !this.isHrOrAdmin(req.user))
      throw new ForbiddenException();
    return this.employeeProfileService.getEmployeeProfileById(id);
  }

  @Patch(':id/self-service')
  @Permissions(Permission.EDIT_OWN_PROFILE)
  updateSelfServiceProfile(
    @Param('id') id: string,
    @Body() dto: UpdateSelfServiceProfileDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    if (req.user.employeeId !== id)
      throw new ForbiddenException('You can only edit your own profile');
    return this.employeeProfileService.updateSelfServiceProfile(id, dto);
  }

  @Post(':id/change-requests')
  @Permissions(Permission.EDIT_OWN_PROFILE)
  createChangeRequestForEmployee(
    @Param('id') id: string,
    @Body() dto: CreateEmployeeProfileChangeRequestDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    if (req.user.employeeId !== id)
      throw new ForbiddenException('You can only request changes for yourself');
    return this.employeeProfileService.createChangeRequest(id, dto);
  }

  @Get(':id/change-requests')
  @Permissions(Permission.EDIT_OWN_PROFILE)
  getMyChangeRequests(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    if (req.user.employeeId !== id && !this.isHrOrAdmin(req.user))
      throw new ForbiddenException();
    return this.employeeProfileService.getMyChangeRequests(id);
  }

  /* ---------- Phase II: Manager Insight ---------- */
  @Get('manager/team')
  @Permissions(Permission.VIEW_TEAM_PROFILES)
  getManagerTeamBrief(
    @Query('supervisorPositionId') supervisorPositionId: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    if (
      req.user.positionId !== supervisorPositionId &&
      !this.isHrOrAdmin(req.user)
    )
      throw new ForbiddenException(
        'You can only view your own direct-report team',
      );
    return this.employeeProfileService.getTeamBriefBySupervisorPosition(
      supervisorPositionId,
    );
  }

  /* ---------- Phase III: HR/Admin Processing & Master Data ---------- */
  @Get('admin/change-requests/pending')
  @Permissions(Permission.MANAGE_ALL_PROFILES)
  getPendingChangeRequests() {
    return this.employeeProfileService.getPendingChangeRequests();
  }

  @Patch('admin/change-requests/:requestId/review')
  @Permissions(Permission.MANAGE_ALL_PROFILES)
  reviewChangeRequest(
    @Param('requestId') requestId: string,
    @Body() dto: ReviewChangeRequestDto,
  ) {
    return this.employeeProfileService.reviewChangeRequest(requestId, dto);
  }

  @Get('admin/search')
  @Permissions(Permission.MANAGE_ALL_PROFILES)
  searchEmployees(@Query('q') query: string) {
    return this.employeeProfileService.searchEmployees(query ?? '');
  }

  @Patch('admin/:id')
  @Permissions(Permission.MANAGE_ALL_PROFILES)
  updateEmployeeProfileAsAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeProfileByAdminDto,
  ) {
    return this.employeeProfileService.updateEmployeeProfileAsAdmin(id, dto);
  }

  @Patch('admin/:id/deactivate')
  @Permissions(Permission.MANAGE_ALL_PROFILES)
  deactivateEmployeeProfile(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.employeeProfileService.deactivateEmployeeProfile(id, reason);
  }

  @Patch('admin/:id/system-roles')
  @Permissions(Permission.MANAGE_ALL_PROFILES)
  setSystemRolesForEmployee(
    @Param('id') id: string,
    @Body() dto: SetEmployeeSystemRolesDto,
  ) {
    return this.employeeProfileService.setEmployeeSystemRoles(id, dto);
  }

  /* =========================================================
      helpers
     ========================================================= */
  private isHrOrAdmin(user: AuthUser): boolean {
    return [
      UserRole.HR_MANAGER,
      UserRole.HR_ADMIN,
      UserRole.SYSTEM_ADMIN,
    ].includes(user.role as UserRole);
  }
}