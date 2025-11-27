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
import { JwtAuthGuard } from '../authorization/guards/jwt-auth.guard';
import { RolesGuard } from '../authorization/guards/roles.guard';
import { Permissions } from '../authorization/decorators/roles.decorators';
import { Permission } from '../authorization/constants/permissions.constant';

@Controller('performance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PerformanceController {
  constructor(private readonly service: PerformanceService) {}

  // =============================
  // Templates (REQ-PP-01)
  // =============================
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

  // =============================
  // Cycles (REQ-PP-02)
  // =============================
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

  // =============================
  // Assignments (REQ-PP-05, REQ-PP-13)
  // =============================
  @Post('assignments/bulk')
  @Permissions(Permission.MANAGE_APPRAISALS)
  bulkAssign(@Body() dto: BulkAssignDto) {
    return this.service.bulkAssign(dto);
  }

  @Get('assignments/manager/:managerId')
  @Permissions(Permission.CONDUCT_APPRAISALS)
  getAssignmentsForManager(@Param('managerId') managerId: string) {
    return this.service.getAssignmentsForManager(managerId);
  }

  @Get('assignments/employee/:employeeId')
  @Permissions(Permission.VIEW_OWN_APPRAISAL)
  getAssignmentsForEmployee(@Param('employeeId') employeeId: string) {
    return this.service.getAssignmentsForEmployee(employeeId);
  }

  @Get('assignments/:id')
  @Permissions(Permission.VIEW_OWN_APPRAISAL, Permission.CONDUCT_APPRAISALS)
  getAssignment(@Param('id') id: string) {
    return this.service.getAssignmentById(id);
  }

  // =============================
  // Records (REQ-AE-03, REQ-AE-04)
  // =============================
  @Post('records')
  @Permissions(Permission.CONDUCT_APPRAISALS)
  submitRecord(@Body() dto: SubmitRecordDto) {
    return this.service.submitRecord(dto);
  }

  @Get('records/:id')
  @Permissions(Permission.VIEW_OWN_APPRAISAL, Permission.CONDUCT_APPRAISALS)
  getRecord(@Param('id') id: string) {
    return this.service.getRecordById(id);
  }

  @Patch('records/:id/publish')
  @Permissions(Permission.MANAGE_APPRAISALS)
  publishRecord(@Param('id') id: string, @Body() body: PublishRecordDto) {
    return this.service.publishRecord(id, body.hrPublishedById);
  }

  @Patch('records/:id/acknowledge')
  @Permissions(Permission.VIEW_OWN_APPRAISAL)
  acknowledge(@Param('id') id: string, @Body() body: AcknowledgeRecordDto) {
    return this.service.acknowledgeRecord(id, body.employeeId, body.comment);
  }

  // =============================
  // Disputes (REQ-AE-07, REQ-OD-07)
  // =============================
  @Post('disputes')
  @Permissions(Permission.VIEW_OWN_APPRAISAL)
  raiseDispute(@Body() dto: RaiseDisputeDto) {
    return this.service.raiseDispute(dto);
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

  // =============================
  // Reminders, Reports, Dashboard
  // =============================
  @Post('cycles/:cycleId/reminders')
  @Permissions(Permission.MANAGE_APPRAISALS)
  sendReminders(@Param('cycleId') cycleId: string) {
    return this.service.sendPendingReminders(cycleId);
  }

  @Get('employees/:employeeId/history')
  @Permissions(Permission.VIEW_OWN_APPRAISAL, Permission.MANAGE_APPRAISALS)
  getEmployeeHistory(
    @Param('employeeId') employeeId: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getEmployeeAppraisalHistory(employeeId, limit);
  }

  @Get('employees/:employeeId/trends')
  @Permissions(Permission.VIEW_OWN_APPRAISAL, Permission.MANAGE_APPRAISALS)
  getEmployeeTrends(@Param('employeeId') employeeId: string) {
    return this.service.getEmployeeAppraisalTrends(employeeId);
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
}