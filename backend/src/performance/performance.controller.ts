import { Controller, Post, Get, Body, Param, Patch, Query } from '@nestjs/common';
import { PerformanceService } from './performance.service';

@Controller('performance')
export class PerformanceController {
  constructor(private readonly service: PerformanceService) {}

  // Templates
  @Post('templates')
  createTemplate(@Body() dto: any) {
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

  // Cycles
  @Post('cycles')
  createCycle(@Body() dto: any) {
    return this.service.createCycle(dto);
  }

  @Patch('cycles/:id/activate')
  activateCycle(@Param('id') id: string) {
    return this.service.activateCycle(id);
  }

  @Get('cycles')
  listCycles(@Query() q: any) {
    return this.service.listCycles(q);
  }

  // Assignments
  @Post('assignments/bulk')
  bulkAssign(@Body() dto: any[]) {
    return this.service.bulkAssign(dto);
  }

  @Get('assignments/manager/:id')
  getAssignmentsForManager(@Param('id') id: string) {
    return this.service.getAssignmentsForManager(id);
  }

  // Records
  @Post('records')
  submitRecord(@Body() dto: any) {
    return this.service.submitRecord(dto);
  }

  @Patch('records/:id/publish')
  publishRecord(@Param('id') id: string, @Body() body: any) {
    return this.service.publishRecord(id, body.hrPublishedById);
  }

  @Patch('records/:id/acknowledge')
  acknowledge(@Param('id') id: string, @Body() body: any) {
    return this.service.acknowledgeRecord(id, body.employeeId, body.comment);
  }

  // Disputes
  @Post('disputes')
  raiseDispute(@Body() dto: any) {
    return this.service.raiseDispute(dto);
  }

  @Patch('disputes/:id/resolve')
  resolveDispute(@Param('id') id: string, @Body() body: any) {
    return this.service.resolveDispute(id, body);
  }

  // Dashboard
  @Get('dashboard/stats')
  stats() {
    return this.service.dashboardStats();
  }
}
