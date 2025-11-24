// src/performance/performance.controller.ts
// Complete controller with ALL requirement endpoints

import { Controller, Post, Get, Patch, Delete, Param, Body, Query } from '@nestjs/common';
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

@Controller('performance')
export class PerformanceController {
  constructor(private readonly service: PerformanceService) {}

  // =============================
  // Templates (REQ-PP-01)
  // =============================
  @Post('templates')
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @Get('templates')
  listTemplates(@Query() query: any) {
    return this.service.listTemplates(query);
  }

  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.service.getTemplateById(id);
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: Partial<CreateTemplateDto>) {
    return this.service.updateTemplate(id, dto);
  }

  @Patch('templates/:id/deactivate')
  deactivateTemplate(@Param('id') id: string) {
    return this.service.deactivateTemplate(id);
  }

  // =============================
  // Cycles (REQ-PP-02)
  // =============================
  @Post('cycles')
  createCycle(@Body() dto: CreateCycleDto) {
    return this.service.createCycle(dto);
  }

  @Get('cycles')
  listCycles(@Query() query: any) {
    return this.service.listCycles(query);
  }

  @Get('cycles/:id')
  getCycle(@Param('id') id: string) {
    return this.service.getCycleById(id);
  }

  @Patch('cycles/:id/activate')
  activateCycle(@Param('id') id: string) {
    return this.service.activateCycle(id);
  }

  @Patch('cycles/:id/close')
  closeCycle(@Param('id') id: string) {
    return this.service.closeCycle(id);
  }

  // =============================
  // Assignments (REQ-PP-05, REQ-PP-13)
  // =============================
  @Post('assignments/bulk')
  bulkAssign(@Body() dto: BulkAssignDto) {
    return this.service.bulkAssign(dto);
  }

  // REQ-PP-13: Manager views assigned appraisal forms
  @Get('assignments/manager/:managerId')
  getAssignmentsForManager(@Param('managerId') managerId: string) {
    return this.service.getAssignmentsForManager(managerId);
  }

  @Get('assignments/employee/:employeeId')
  getAssignmentsForEmployee(@Param('employeeId') employeeId: string) {
    return this.service.getAssignmentsForEmployee(employeeId);
  }

  @Get('assignments/:id')
  getAssignment(@Param('id') id: string) {
    return this.service.getAssignmentById(id);
  }

  // =============================
  // Records (REQ-AE-03, REQ-AE-04)
  // =============================
  @Post('records')
  submitRecord(@Body() dto: SubmitRecordDto) {
    return this.service.submitRecord(dto);
  }

  @Get('records/:id')
  getRecord(@Param('id') id: string) {
    return this.service.getRecordById(id);
  }

  // REQ-AE-06 & REQ-AE-10: HR publishes record
  @Patch('records/:id/publish')
  publishRecord(@Param('id') id: string, @Body() body: PublishRecordDto) {
    return this.service.publishRecord(id, body.hrPublishedById);
  }

  // REQ-OD-01: Employee acknowledges and views final rating
  @Patch('records/:id/acknowledge')
  acknowledge(@Param('id') id: string, @Body() body: AcknowledgeRecordDto) {
    return this.service.acknowledgeRecord(id, body.employeeId, body.comment);
  }

  // =============================
  // Disputes (REQ-AE-07, REQ-OD-07)
  // =============================
  @Post('disputes')
  raiseDispute(@Body() dto: RaiseDisputeDto) {
    return this.service.raiseDispute(dto);
  }

  @Get('disputes')
  listDisputes(@Query() query: any) {
    return this.service.listDisputes(query);
  }

  @Get('disputes/:id')
  getDispute(@Param('id') id: string) {
    return this.service.getDisputeById(id);
  }

  // REQ-OD-07: HR Manager resolves dispute
  @Patch('disputes/:id/resolve')
  resolveDispute(@Param('id') id: string, @Body() body: ResolveDisputeDto) {
    return this.service.resolveDispute(id, body);
  }

  // =============================
  // **NEW: REQ-AE-06 - Reminders**
  // =============================
  @Post('cycles/:cycleId/reminders')
  sendReminders(@Param('cycleId') cycleId: string) {
    return this.service.sendPendingReminders(cycleId);
  }

  // =============================
  // **NEW: REQ-OD-08 - Historical Analysis**
  // =============================
  @Get('employees/:employeeId/history')
  getEmployeeHistory(
    @Param('employeeId') employeeId: string,
    @Query('limit') limit?: number
  ) {
    return this.service.getEmployeeAppraisalHistory(employeeId, limit);
  }

  @Get('employees/:employeeId/trends')
  getEmployeeTrends(@Param('employeeId') employeeId: string) {
    return this.service.getEmployeeAppraisalTrends(employeeId);
  }

  // =============================
  // **NEW: REQ-OD-06 - Export Reports**
  // =============================
  @Get('reports/cycle/:cycleId')
  getCycleReport(@Param('cycleId') cycleId: string) {
    return this.service.generateCycleReport(cycleId);
  }

  @Get('reports/department/:departmentId')
  getDepartmentReport(
    @Param('departmentId') departmentId: string,
    @Query('cycleId') cycleId?: string
  ) {
    return this.service.generateDepartmentReport(departmentId, cycleId);
  }

  @Get('reports/export')
  exportRecords(
    @Query('cycleId') cycleId?: string,
    @Query('format') format?: 'json' | 'csv'
  ) {
    return this.service.exportAllRecords(cycleId, format);
  }

  // =============================
  // Dashboard (REQ-AE-10)
  // =============================
  @Get('dashboard/stats')
  getDashboardStats(@Query('departmentId') departmentId?: string) {
    return this.service.dashboardStats(departmentId);
  }

  // REQ-AE-10: Consolidated dashboard tracking department-level progress
  @Get('dashboard/department-progress')
  getDepartmentProgress(@Query('cycleId') cycleId?: string) {
    return this.service.getDepartmentProgress(cycleId);
  }
}