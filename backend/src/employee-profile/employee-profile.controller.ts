import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { EmployeeProfileService } from './employee-profile.service';
import { UpdateSelfServiceProfileDto } from './dto/update-self-service-profile.dto';
import { CreateEmployeeProfileChangeRequestDto } from './dto/create-change-request.dto';
import { ReviewChangeRequestDto } from './dto/review-change-request.dto';
import { UpdateEmployeeProfileByAdminDto } from './dto/update-employee-profile-admin.dto';
import { SetEmployeeSystemRolesDto } from './dto/set-system-roles.dto';
import { CreateEmployeeProfileDto } from './dto/create-employee-profile.dto';

@Controller('employee-profile')
export class EmployeeProfileController {
  constructor(
    private readonly employeeProfileService: EmployeeProfileService,
  ) {}

  // ---------- Admin: Create Employee ----------

  // POST /employee-profile/admin
  @Post('admin')
  createEmployeeProfile(@Body() dto: CreateEmployeeProfileDto) {
    return this.employeeProfileService.createEmployeeProfile(dto);
  }

  // ---------- Phase I: Self-Service ----------

  // GET /employee-profile/:id
  @Get(':id')
  getEmployeeProfile(@Param('id') id: string) {
    return this.employeeProfileService.getEmployeeProfileById(id);
  }

  // PATCH /employee-profile/:id/self-service
  @Patch(':id/self-service')
  updateSelfServiceProfile(
    @Param('id') id: string,
    @Body() dto: UpdateSelfServiceProfileDto,
  ) {
    return this.employeeProfileService.updateSelfServiceProfile(id, dto);
  }

  // POST /employee-profile/:id/change-requests
  @Post(':id/change-requests')
  createChangeRequestForEmployee(
    @Param('id') id: string,
    @Body() dto: CreateEmployeeProfileChangeRequestDto,
  ) {
    return this.employeeProfileService.createChangeRequest(id, dto);
  }

  // GET /employee-profile/:id/change-requests
  @Get(':id/change-requests')
  getMyChangeRequests(@Param('id') id: string) {
    return this.employeeProfileService.getMyChangeRequests(id);
  }

  // ---------- Phase II: Manager Insight ----------

  // GET /employee-profile/manager/team?supervisorPositionId=...
  @Get('manager/team')
  getManagerTeamBrief(
    @Query('supervisorPositionId') supervisorPositionId: string,
  ) {
    return this.employeeProfileService.getTeamBriefBySupervisorPosition(
      supervisorPositionId,
    );
  }

  // ---------- Phase III: HR/Admin Processing & Master Data ----------

  // GET /employee-profile/admin/change-requests/pending
  @Get('admin/change-requests/pending')
  getPendingChangeRequests() {
    return this.employeeProfileService.getPendingChangeRequests();
  }

  // PATCH /employee-profile/admin/change-requests/:requestId/review
  @Patch('admin/change-requests/:requestId/review')
  reviewChangeRequest(
    @Param('requestId') requestId: string,
    @Body() dto: ReviewChangeRequestDto,
  ) {
    return this.employeeProfileService.reviewChangeRequest(
      requestId,
      dto,
    );
  }

  // GET /employee-profile/admin/search?q=...
  @Get('admin/search')
  searchEmployees(@Query('q') query: string) {
    return this.employeeProfileService.searchEmployees(query ?? '');
  }

  // PATCH /employee-profile/admin/:id
  @Patch('admin/:id')
  updateEmployeeProfileAsAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeProfileByAdminDto,
  ) {
    return this.employeeProfileService.updateEmployeeProfileAsAdmin(
      id,
      dto,
    );
  }

  // PATCH /employee-profile/admin/:id/deactivate
  @Patch('admin/:id/deactivate')
  deactivateEmployeeProfile(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.employeeProfileService.deactivateEmployeeProfile(
      id,
      reason,
    );
  }

  // PATCH /employee-profile/admin/:id/system-roles
  @Patch('admin/:id/system-roles')
  setSystemRolesForEmployee(
    @Param('id') id: string,
    @Body() dto: SetEmployeeSystemRolesDto,
  ) {
    return this.employeeProfileService.setEmployeeSystemRoles(id, dto);
  }
}
