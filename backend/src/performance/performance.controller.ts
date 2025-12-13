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
} from './dto/performance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/roles.decorators';
import { Permission } from '../auth/permissions.constant';
import { AuthUser } from '../auth/auth-user.interface';
import type { Request } from 'express';

@Controller('performance')
//@UseGuards(JwtAuthGuard, RolesGuard) 
export class PerformanceController {
  constructor(private readonly service: PerformanceService) {}

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
  @Permissions(Permission.MANAGE_APPRAISALS)
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

  @Post('cycles/:cycleId/reminders')
  @Permissions(Permission.MANAGE_APPRAISALS)
  sendReminders(@Param('cycleId') cycleId: string) {
    return this.service.sendPendingReminders(cycleId);
  }

  /* =========================================================
      Assignments (Step 3A – HR Employee / Line Manager)
  ========================================================= */
  @Post('assignments/bulk')
  @Permissions(Permission.MANAGE_APPRAISALS)
  bulkAssign(@Body() dto: BulkAssignDto) {
    return this.service.bulkAssign(dto);
  }

  @Get('assignments/manager/:managerId')
  @Permissions(Permission.CONDUCT_APPRAISALS)
  getAssignmentsForManager(
    @Param('managerId') managerId: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.service.getAssignmentsForManager(managerId, req.user);
  }

  @Get('assignments/employee/:employeeId')
  @Permissions(Permission.VIEW_OWN_APPRAISAL)
  getAssignmentsForEmployee(
    @Param('employeeId') employeeId: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.service.getAssignmentsForEmployee(employeeId, req.user);
  }

  @Get('assignments/:id')
  @Permissions(Permission.VIEW_OWN_APPRAISAL, Permission.CONDUCT_APPRAISALS)
  getAssignment(@Param('id') id: string) {
    return this.service.getAssignmentById(id);
  }

  /* =========================================================
      Records (Step 3B / 5 – Manager / Employee)
  ========================================================= */
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

  @Patch('records/:id/acknowledge')
  @Permissions(Permission.VIEW_OWN_APPRAISAL)
  acknowledge(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthUser },
    @Body() body: AcknowledgeRecordDto,
  ) {
    return this.service.acknowledgeRecord(id, body.employeeId.toString(), body.comment, req.user);
  }

  /* =========================================================
      Disputes (Step 6 / 7 – Employee / HR Manager)
  ========================================================= */
  @Post('disputes')
  @Permissions(Permission.RAISE_DISPUTE)
  raiseDispute(@Body() dto: RaiseDisputeDto, @Req() req: Request & { user: AuthUser }) {
    return this.service.raiseDispute(dto, req.user);
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
    return this.service.resolveDispute(id, body);
  }

  /* =========================================================
      Reports / Dashboard (Step 4 – HR Manager)
  ========================================================= */
  @Get('employees/:employeeId/history')
  @Permissions(Permission.VIEW_OWN_APPRAISAL, Permission.MANAGE_APPRAISALS)
  getEmployeeHistory(
    @Param('employeeId') employeeId: string,
    @Req() req: Request & { user: AuthUser },
    @Query('limit') limit?: number,
  ) {
    return this.service.getEmployeeAppraisalHistory(employeeId, limit, req.user);
  }

  @Get('employees/:employeeId/trends')
  @Permissions(Permission.VIEW_OWN_APPRAISAL, Permission.MANAGE_APPRAISALS)
  getEmployeeTrends(@Param('employeeId') employeeId: string, @Req() req: Request & { user: AuthUser }) {
    return this.service.getEmployeeAppraisalTrends(employeeId, req.user);
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
    @Query('format') format?: 'json' | 'csv',
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
}