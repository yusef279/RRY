// src/performance/performance.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PerformanceService } from './performance.service';
import {
  CreateTemplateDto,
  CreateCycleDto,
  BulkAssignDto,
  SubmitRecordDto,
  PublishRecordDto,
  AcknowledgeRecordDto,
  RaiseDisputeDto,
  ResolveDisputeDto,
  UpdateAppraisalRecordDto,
} from './dto/performance.dto';

import {
  JwtAuthGuard,
  PermissionsGuard,
  Permissions,
  CurrentUser,
} from '../auth';
import { Permission } from '../auth/permissions.constant';
import type { AuthUser } from '../auth/auth-user.interface';
import { SystemRole } from '../employee-profile/enums/employee-profile.enums';
import { AppraisalAssignmentStatus } from './enums/performance.enums'; // ADD THIS IMPORT

@Controller('performance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PerformanceController {
  constructor(private readonly service: PerformanceService) { }

  /* =========================================================
      Templates (Step 1 – HR Manager)
  ========================================================= */
  @Post('templates')
  @Permissions(Permission.MANAGE_APPRAISALS)
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @Get('templates')
  @Permissions(Permission.MANAGE_APPRAISALS)
  listTemplates(@Query() query: any) {
    return this.service.listTemplates(query);
  }

  @Get('templates/:id')
  @Permissions(Permission.MANAGE_APPRAISALS)
  getTemplate(@Param('id') id: string) {
    return this.service.getTemplateById(id);
  }

  @Patch('templates/:id')
  @Permissions(Permission.CONDUCT_APPRAISALS)
  updateTemplate(@Param('id') id: string, @Body() dto: Partial<CreateTemplateDto>) {
    return this.service.updateTemplate(id, dto);
  }

  @Patch('templates/:id/deactivate')
  @Permissions(Permission.MANAGE_APPRAISALS)
  deactivateTemplate(@Param('id') id: string) {
    return this.service.deactivateTemplate(id);
  }

  /* =========================================================
      Cycles (Step 2 – HR Manager)
  ========================================================= */
  @Post('cycles')
  @Permissions(Permission.MANAGE_APPRAISALS)
  createCycle(@Body() dto: CreateCycleDto) {
    return this.service.createCycle(dto);
  }

  @Get('cycles')
  @Permissions(Permission.MANAGE_APPRAISALS)
  listCycles(@Query() query: any) {
    return this.service.listCycles(query);
  }

  @Get('cycles/:id')
  @Permissions(Permission.MANAGE_APPRAISALS)
  getCycle(@Param('id') id: string) {
    return this.service.getCycleById(id);
  }

  @Patch('cycles/:id/activate')
  @Permissions(Permission.MANAGE_APPRAISALS)
  activateCycle(@Param('id') id: string) {
    return this.service.activateCycle(id);
  }

  @Patch('cycles/:id/close')
  @Permissions(Permission.MANAGE_APPRAISALS)
  closeCycle(@Param('id') id: string) {
    return this.service.closeCycle(id);
  }

  @Put('cycles/:id')
  @Permissions(Permission.MANAGE_APPRAISALS)
  updateCycle(@Param('id') id: string, @Body() dto: Partial<CreateCycleDto>) {
    return this.service.updateCycle(id, dto);
  }

  @Post('cycles/:cycleId/reminders')
  @Permissions(Permission.MANAGE_APPRAISALS)
  sendReminders(@Param('cycleId') cycleId: string) {
    return this.service.sendPendingReminders(cycleId);
  }

  /* =========================================================
      Assignments (Step 3A – HR Employee / Line Manager)
  ========================================================= */
  // Add this endpoint BEFORE or AFTER the other assignment endpoints
  @Get('assignments')
  @Permissions(Permission.MANAGE_APPRAISALS)
  getAssignments(
    @Query('cycleId') cycleId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('managerId') managerId?: string,
    @Query('status') status?: string
  ) {
    return this.service.getAssignments({
      cycleId,
      employeeId,
      managerId,
      status
    });
  }
  @Post('assignments/bulk')
  @Permissions(Permission.MANAGE_APPRAISALS)
  bulkAssign(@Body() dto: BulkAssignDto, @CurrentUser() user: AuthUser) { // ← added user
    return this.service.bulkAssign(dto, user);
  }
  @Get('assignments/manager/my')
  @Permissions(Permission.CONDUCT_APPRAISALS)
  getMyAssignments(@CurrentUser() user: AuthUser) {
    if (!user.employeeId) {
      throw new ForbiddenException('User not linked to an employee profile');
    }
    return this.service.getAssignmentsForManager(user.employeeId);
  }

  @Get('assignments/employee/:employeeId')
  @Permissions(Permission.VIEW_OWN_APPRAISAL)
  getAssignmentsForEmployee(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getAssignmentsForEmployee(employeeId, user);
  }

  @Get('assignments/:id')
  @Permissions(Permission.VIEW_OWN_APPRAISAL, Permission.CONDUCT_APPRAISALS)
  getAssignment(@Param('id') id: string) {
    return this.service.getAssignmentById(id);
  }


  /* =========================================================
      NEW: Assignment Update Endpoints
  ========================================================= */
  @Patch('assignments/:id')
  @Permissions(Permission.CONDUCT_APPRAISALS)
  updateAssignment(
    @Param('id') id: string,
    @Body() updateData: {
      answers?: any;
      status?: AppraisalAssignmentStatus;
      dueDate?: Date;
    },
    @CurrentUser() user: AuthUser
  ) {
    return this.service.updateAssignment(id, updateData, user);
  }

  @Patch('assignments/:id/draft')
  @Permissions(Permission.CONDUCT_APPRAISALS)
  saveDraft(
    @Param('id') id: string,
    @Body() body: { answers: any },
    @CurrentUser() user: AuthUser
  ) {
    return this.service.saveDraft(id, body.answers, user);
  }

  @Patch('assignments/:id/submit')
  @Permissions(Permission.CONDUCT_APPRAISALS)
  submitAssignment(
    @Param('id') id: string,
    @Body() body: { answers: any },
    @CurrentUser() user: AuthUser
  ) {
    return this.service.submitAssignment(id, body.answers, user);
  }


  /* =========================================================
      Records (Step 3B / 5 – Manager / Employee)
  ========================================================= */
  @Post('records')
  @Permissions(Permission.CONDUCT_APPRAISALS)
  submitRecord(@Body() dto: SubmitRecordDto, @CurrentUser() user: AuthUser) {
    return this.service.submitRecord(dto, user);
  }

  @Get('records/:id')
  @Permissions(Permission.VIEW_OWN_APPRAISAL, Permission.CONDUCT_APPRAISALS)
  getRecord(@Param('id') id: string) {
    return this.service.getRecordById(id);
  }

  @Patch('records/:id/publish')
  @Permissions(Permission.MANAGE_APPRAISALS)
  publishRecord(@Param('id') id: string, @Body() body: PublishRecordDto) {
    return this.service.publishRecord(id, body.hrPublishedById?.toString());
  }

  @Patch('records/:id/acknowledge')
  @Permissions(Permission.VIEW_OWN_APPRAISAL)
  acknowledge(
    @Param('id') id: string,
    @Body() body: AcknowledgeRecordDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.acknowledgeRecord(id, body.employeeId.toString(), body.comment, user);
  }
  @Get('records')
  @Permissions(Permission.MANAGE_APPRAISALS)
  listRecords(@Query() query: any) {
    return this.service.listRecords(query);
  }


  /* =========================================================
      Disputes (Step 6 / 7 – Employee / HR Manager)
  ========================================================= */
  @Post('disputes')
  @Permissions(Permission.RAISE_DISPUTE)
  raiseDispute(@Body() dto: RaiseDisputeDto, @CurrentUser() user: AuthUser) {
    return this.service.raiseDispute(dto, user);
  }

  @Get('disputes')
  @Permissions(Permission.RESOLVE_DISPUTE)
  listDisputes(@Query() query: any) {
    return this.service.listDisputes(query);
  }

  @Get('disputes/:id')
  @Permissions(Permission.RESOLVE_DISPUTE, Permission.VIEW_OWN_APPRAISAL)
  getDispute(@Param('id') id: string) {
    return this.service.getDisputeById(id);
  }

  @Patch('disputes/:id/resolve')
  @Permissions(Permission.RESOLVE_DISPUTE)
  resolveDispute(@Param('id') id: string, @Body() body: ResolveDisputeDto) {
    console.log('🎯 [CONTROLLER] Starting resolve for ID:', id);
    return this.service.resolveDispute(id, body);
  }
  @Patch('records/:id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ALL_PROFILES)
  async updateAppraisalRecord(
    @Param('id') id: string,
    @Body() dto: UpdateAppraisalRecordDto,
  ) {
    return this.service.updateAppraisalRecord(id, dto);
  }

  /* =========================================================
      Reports / Dashboard (Step 4 – HR Manager)
  ========================================================= */
  @Get('employees/:employeeId/history')
  getEmployeeHistory(
    @Param('employeeId') employeeId: string,
    @Query('limit') limit: number,
    @CurrentUser() user: AuthUser,
  ) {
    const isSelf = user.employeeId && String(user.employeeId) === String(employeeId);
    if (!isSelf && !this.canViewOthersPerformance(user)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return this.service.getEmployeeAppraisalHistory(employeeId, limit, user);
  }

  @Get('employees/:employeeId/trends')
  @Permissions(Permission.VIEW_OWN_APPRAISAL, Permission.MANAGE_APPRAISALS)
  getEmployeeTrends(@Param('employeeId') employeeId: string, @CurrentUser() user: AuthUser) {
    return this.service.getEmployeeAppraisalTrends(employeeId, user);
  }

  @Get('reports/cycle/:cycleId')
  @Permissions(Permission.EXPORT_APPRAISAL_REPORTS)
  getCycleReport(@Param('cycleId') cycleId: string) {
    return this.service.generateCycleReport(cycleId);
  }

  @Get('reports/department/:departmentId')
  @Permissions(Permission.EXPORT_APPRAISAL_REPORTS)
  getDepartmentReport(
    @Param('departmentId') departmentId: string,
    @Query('cycleId') cycleId?: string,
  ) {
    return this.service.generateDepartmentReport(departmentId, cycleId);
  }

  @Get('reports/export')
  @Permissions(Permission.EXPORT_APPRAISAL_REPORTS)
  exportRecords(
    @Query('cycleId') cycleId?: string,
    @Query('format') format: 'json' | 'csv' = 'json',
  ) {
    return this.service.exportAllRecords(cycleId, format);
  }

  @Get('dashboard/stats')
  @Permissions(Permission.VIEW_APPRAISAL_DASHBOARD)
  getDashboardStats(@Query('departmentId') departmentId?: string) {
    return this.service.dashboardStats(departmentId);
  }

  @Get('dashboard/department-progress')
  @Permissions(Permission.VIEW_APPRAISAL_DASHBOARD)
  getDepartmentProgress(@Query('cycleId') cycleId?: string) {
    return this.service.getDepartmentProgress(cycleId);
  }

  /* =========================================================
      helpers (identical to employee-profile.controller)
  ========================================================= */
  private canViewOthersPerformance(user: AuthUser): boolean {
    if (this.isHrOrAdmin(user)) return true;
    const perms = user.permissions ?? [];
    return (
      perms.includes(Permission.MANAGE_APPRAISALS) ||
      perms.includes(Permission.CONDUCT_APPRAISALS)
    );
  }

  private isHrOrAdmin(user: AuthUser): boolean {
    const allowedRoles = [
      SystemRole.HR_MANAGER,
      SystemRole.HR_ADMIN,
      SystemRole.HR_EMPLOYEE,
      SystemRole.SYSTEM_ADMIN,
    ];
    const roles = [user.role, ...(user.roles ?? [])].filter(Boolean) as SystemRole[];
    return roles.some((r) => allowedRoles.includes(r));

  }
  /* =========================================================
     Missing route – always returns dispute (even resolved)
 ========================================================= */
  @Get('disputes/appraisal/:appraisalId/employee/:employeeId')
  @Permissions(Permission.VIEW_OWN_APPRAISAL)   // or any permission you already import
  async getDisputeByAppraisalAndEmployee(
    @Param('appraisalId') appraisalId: string,
    @Param('employeeId') employeeId: string,
  ) {
    // service returns null or the dispute document (any status)
    return this.service.getDisputeByAppraisalAndEmployee(appraisalId, employeeId);
  }
}