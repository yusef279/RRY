import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
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
} from './dto/performance.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
import { Permissions } from '../auth/decorators/roles.decorators';
import { Permission } from '../auth/permissions.constant';
import { AuthUser } from '../auth/auth-user.interface';
import { Request } from 'express';
import { SystemRole } from '../employee-profile/enums/employee-profile.enums';

@Controller('performance')
//@UseGuards(JwtAuthGuard, RolesGuard)
export class PerformanceController {
  constructor(private readonly service: PerformanceService) {}

  /* ----------  Templates (REQ-PP-01)  ---------- */
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
  @Permissions(Permission.MANAGE_APPRAISALS)
  updateTemplate(@Param('id') id: string, @Body() dto: Partial<CreateTemplateDto>) {
    return this.service.updateTemplate(id, dto);
  }

  @Patch('templates/:id/deactivate')
  @Permissions(Permission.MANAGE_APPRAISALS)
  deactivateTemplate(@Param('id') id: string) {
    return this.service.deactivateTemplate(id);
  }

  /* ----------  Cycles (REQ-PP-02)  ---------- */
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

  /* ----------  Assignments (REQ-PP-05, REQ-PP-13)  ---------- */
  @Post('assignments/bulk')
  @Permissions(Permission.MANAGE_APPRAISALS)
  bulkAssign(@Body() dto: BulkAssignDto) {
    return this.service.bulkAssign(dto);
  }

  /**  USER-SCOPED  */
  @Get('assignments/manager/:managerId')
  @Permissions(Permission.CONDUCT_APPRAISALS)
  getAssignmentsForManager(
    @Param('managerId') managerId: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.service.getAssignmentsForManager(managerId.toString(), req.user);
  }

  /**  USER-SCOPED  */
  @Get('assignments/employee/:employeeId')
  @Permissions(Permission.VIEW_OWN_APPRAISAL)
  getAssignmentsForEmployee(
    @Param('employeeId') employeeId: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.service.getAssignmentsForEmployee(employeeId.toString(), req.user);
  }

  @Get('assignments/:id')
  @Permissions(Permission.VIEW_OWN_APPRAISAL, Permission.CONDUCT_APPRAISALS)
  getAssignment(@Param('id') id: string) {
    return this.service.getAssignmentById(id);
  }

  /* ----------  Records (REQ-AE-03, REQ-AE-04)  ---------- */
  /**  USER-SCOPED  */
  @Post('records')
  @Permissions(Permission.CONDUCT_APPRAISALS)
  submitRecord(@Body() dto: SubmitRecordDto, @Req() req: Request & { user: AuthUser }) {
    return this.service.submitRecord(dto, req.user);
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

  /**  USER-SCOPED  */
@Patch('records/:id/acknowledge')
@Permissions(Permission.VIEW_OWN_APPRAISAL)
acknowledge(
  @Param('id') id: string,
  @Req() req: Request & { user: AuthUser },
  @Body() body: AcknowledgeRecordDto,
) {
  return this.service.acknowledgeRecord(id, body.employeeId.toString(), body.comment, req.user);
}
  /* ----------  Disputes (REQ-AE-07, REQ-OD-07)  ---------- */
  /**  USER-SCOPED  */
  @Post('disputes')
  @Permissions(Permission.VIEW_OWN_APPRAISAL)
  raiseDispute(@Body() dto: RaiseDisputeDto, @Req() req: Request & { user: AuthUser }) {
    return this.service.raiseDispute(dto, req.user);
  }

  @Get('disputes')
  @Permissions(Permission.MANAGE_APPRAISALS)
  listDisputes(@Query() query: any) {
    return this.service.listDisputes(query);
  }

  @Get('disputes/:id')
  @Permissions(Permission.MANAGE_APPRAISALS, Permission.VIEW_OWN_APPRAISAL)
  getDispute(@Param('id') id: string) {
    return this.service.getDisputeById(id);
  }

  @Patch('disputes/:id/resolve')
  @Permissions(Permission.MANAGE_APPRAISALS)
  resolveDispute(@Param('id') id: string, @Body() body: ResolveDisputeDto) {
    return this.service.resolveDispute(id, body);
  }

  /* ----------  Reminders / Reports / Dashboard  ---------- */
  @Post('cycles/:cycleId/reminders')
  @Permissions(Permission.MANAGE_APPRAISALS)
  sendReminders(@Param('cycleId') cycleId: string) {
    return this.service.sendPendingReminders(cycleId);
  }

  /**  USER-SCOPED  */
  @Get('employees/:employeeId/history')
  getEmployeeHistory(
    @Param('employeeId') employeeId: string,
    @Req() req: Request & { user: AuthUser },
    @Query('limit') limit?: number,
  ) {
    const user = req.user;
    if (!user) throw new ForbiddenException('Insufficient permissions');

    const isSelf = user.employeeId && String(user.employeeId) === String(employeeId);
    if (!isSelf && !this.canViewOthersPerformance(user)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.service.getEmployeeAppraisalHistory(employeeId, limit, req.user);
  }

  /**  USER-SCOPED  */
  @Get('employees/:employeeId/trends')
  @Permissions(Permission.VIEW_OWN_APPRAISAL, Permission.MANAGE_APPRAISALS)
  getEmployeeTrends(@Param('employeeId') employeeId: string, @Req() req: Request & { user: AuthUser }) {
    return this.service.getEmployeeAppraisalTrends(employeeId, req.user);
  }

  @Get('reports/cycle/:cycleId')
  @Permissions(Permission.MANAGE_APPRAISALS)
  getCycleReport(@Param('cycleId') cycleId: string) {
    return this.service.generateCycleReport(cycleId);
  }

  @Get('reports/department/:departmentId')
  @Permissions(Permission.MANAGE_APPRAISALS)
  getDepartmentReport(
    @Param('departmentId') departmentId: string,
    @Query('cycleId') cycleId?: string,
  ) {
    return this.service.generateDepartmentReport(departmentId, cycleId);
  }

  @Get('reports/export')
  @Permissions(Permission.MANAGE_APPRAISALS)
  exportRecords(
    @Query('cycleId') cycleId?: string,
    @Query('format') format?: 'json' | 'csv',
  ) {
    return this.service.exportAllRecords(cycleId, format);
  }

  @Get('dashboard/stats')
  @Permissions(Permission.MANAGE_APPRAISALS, Permission.VIEW_OWN_APPRAISAL)
  getDashboardStats(@Query('departmentId') departmentId?: string) {
    return this.service.dashboardStats(departmentId);
  }

  @Get('dashboard/department-progress')
  @Permissions(Permission.MANAGE_APPRAISALS)
  getDepartmentProgress(@Query('cycleId') cycleId?: string) {
    return this.service.getDepartmentProgress(cycleId);
  }

  /* helpers */
  private canViewOthersPerformance(user: AuthUser): boolean {
    if (this.isHrOrAdmin(user)) return true;
    const perms = (user as any).permissions ?? [];
    return (
      perms.includes(Permission.MANAGE_APPRAISALS) ||
      perms.includes(Permission.CONDUCT_APPRAISALS)
    );
  }

  private isHrOrAdmin(user: AuthUser): boolean {
    const roles = [user.role, ...((user as any).roles ?? [])].filter(Boolean) as SystemRole[];
    return roles.some((role) =>
      [
        SystemRole.HR_MANAGER,
        SystemRole.HR_ADMIN,
        SystemRole.HR_EMPLOYEE,
        SystemRole.SYSTEM_ADMIN,
      ].includes(role),
    );
  }
}
