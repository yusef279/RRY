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
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { EmployeeProfileService } from './employee-profile.service';
import { UpdateSelfServiceProfileDto } from './dto/update-self-service-profile.dto';
import { CreateEmployeeProfileChangeRequestDto } from './dto/create-change-request.dto';
import { ReviewChangeRequestDto } from './dto/review-change-request.dto';
import { UpdateEmployeeProfileByAdminDto } from './dto/update-employee-profile-admin.dto';
import { SetEmployeeSystemRolesDto } from './dto/set-system-roles.dto';
import { CreateEmployeeProfileDto } from './dto/create-employee-profile.dto';

import {
  JwtAuthGuard,
  PermissionsGuard,
  Permissions,
  CurrentUser,
} from '../auth';
import { Permission, UserRole } from '../auth';
import type { AuthUser } from '../auth';

@Controller('employee-profile')
@UseGuards(JwtAuthGuard)
export class EmployeeProfileController {
  constructor(private readonly employeeProfileService: EmployeeProfileService) {}

  /* ---------- Admin: Create Employee ---------- */
  @Post('admin')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ALL_PROFILES)
  createEmployeeProfile(@Body() dto: CreateEmployeeProfileDto) {
    return this.employeeProfileService.createEmployeeProfile(dto);
  }

  /* ---------- Phase I: Self-Service ---------- */
  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.EDIT_OWN_PROFILE) // minimal permission; owner scoping below
  getEmployeeProfile(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (user.employeeId !== id && !this.isHrOrAdmin(user))
      throw new ForbiddenException();
    return this.employeeProfileService.getEmployeeProfileById(id);
  }

  @Patch(':id/self-service')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.EDIT_OWN_PROFILE)
  updateSelfServiceProfile(
    @Param('id') id: string,
    @Body() dto: UpdateSelfServiceProfileDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.employeeId !== id)
      throw new ForbiddenException('You can only edit your own profile');
    return this.employeeProfileService.updateSelfServiceProfile(id, dto);
  }

  @Post(':id/change-requests')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.EDIT_OWN_PROFILE)
  createChangeRequestForEmployee(
    @Param('id') id: string,
    @Body() dto: CreateEmployeeProfileChangeRequestDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.employeeId !== id)
      throw new ForbiddenException('You can only request changes for yourself');
    return this.employeeProfileService.createChangeRequest(id, dto);
  }

  @Get(':id/change-requests')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.EDIT_OWN_PROFILE)
  getMyChangeRequests(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (user.employeeId !== id && !this.isHrOrAdmin(user))
      throw new ForbiddenException();
    return this.employeeProfileService.getMyChangeRequests(id);
  }

  /* ---------- Phase II: Manager Insight ---------- */
  @Get('manager/team')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.VIEW_TEAM_PROFILES)
  getManagerTeamBrief(
    @Query('supervisorPositionId') supervisorPositionId: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (
      user.positionId !== supervisorPositionId &&
      !this.isHrOrAdmin(user)
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
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ALL_PROFILES)
  getPendingChangeRequests() {
    return this.employeeProfileService.getPendingChangeRequests();
  }

  @Patch('admin/change-requests/:requestId/review')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ALL_PROFILES)
  reviewChangeRequest(
    @Param('requestId') requestId: string,
    @Body() dto: ReviewChangeRequestDto,
  ) {
    return this.employeeProfileService.reviewChangeRequest(requestId, dto);
  }

  @Get('admin/search')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ALL_PROFILES)
  searchEmployees(@Query('q') query: string) {
    return this.employeeProfileService.searchEmployees(query ?? '');
  }

  @Patch('admin/:id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ALL_PROFILES)
  updateEmployeeProfileAsAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeProfileByAdminDto,
  ) {
    return this.employeeProfileService.updateEmployeeProfileAsAdmin(id, dto);
  }

  @Patch('admin/:id/deactivate')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ALL_PROFILES)
  deactivateEmployeeProfile(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.employeeProfileService.deactivateEmployeeProfile(id, reason);
  }

  @Patch('admin/:id/system-roles')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ALL_PROFILES)
  setSystemRolesForEmployee(
    @Param('id') id: string,
    @Body() dto: SetEmployeeSystemRolesDto,
  ) {
    return this.employeeProfileService.setEmployeeSystemRoles(id, dto);
  }

  /* ---------- Profile Picture Upload ---------- */
  @Post('admin/:id/profile-picture')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ALL_PROFILES)
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      storage: diskStorage({
        destination: './uploads/profile-pictures',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadProfilePicture(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new ForbiddenException('No file uploaded');
    }
    const fileUrl = `/uploads/profile-pictures/${file.filename}`;
    return this.employeeProfileService.updateProfilePicture(id, fileUrl);
  }


  /* =========================================================
      helpers
     ========================================================= */
  private isHrOrAdmin(user: AuthUser): boolean {
    return [
      UserRole.HR_MANAGER,
      UserRole.HR_ADMIN,
      UserRole.HR_EMPLOYEE,
      UserRole.SYSTEM_ADMIN,
    ].includes(user.role as UserRole);
  }
}
