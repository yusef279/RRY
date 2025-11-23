import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { Types } from 'mongoose';

@Controller('performance')
export class PerformanceController {
  constructor(private readonly service: PerformanceService) {}

  // ===== TEMPLATES =====
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
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID');
    return this.service.getTemplateById(id);
  }

  // ===== CYCLES =====
  @Post('cycles')
  createCycle(@Body() dto: any) {
    return this.service.createCycle(dto);
  }

  @Patch('cycles/:id/activate')
  activateCycle(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID');
    return this.service.activateCycle(id);
  }

  @Get('cycles')
  listCycles(@Query() q: any) {
    return this.service.listCycles(q);
  }

  // ===== ASSIGNMENTS =====
  @Post('assignments/bulk')
  bulkAssign(@Body() dto: any[]) {
    if (!Array.isArray(dto)) throw new BadRequestException('Body must be an array');
    return this.service.bulkAssign(dto);
  }

  @Get('assignments/manager/:id')
  getAssignmentsForManager(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID');
    return this.service.getAssignmentsForManager(id);
  }

  // ===== RECORDS =====
  @Post('records')
  submitRecord(@Body() dto: any) {
    return this.service.submitRecord(dto);
  }

  @Patch('records/:id/publish')
  publishRecord(@Param('id') id: string, @Body() body: { hrPublishedById: string }) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid record ID');
    if (!Types.ObjectId.isValid(body.hrPublishedById))
      throw new BadRequestException('Invalid HR employee ID');
    return this.service.publishRecord(id, body.hrPublishedById);
  }

  @Patch('records/:id/acknowledge')
  acknowledge(
    @Param('id') id: string,
    @Body() body: { employeeId: string; comment?: string },
  ) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid record ID');
    if (!Types.ObjectId.isValid(body.employeeId))
      throw new BadRequestException('Invalid employee ID');
    return this.service.acknowledgeRecord(id, body.employeeId, body.comment);
  }

  // ===== DISPUTES =====
  @Post('disputes')
  raiseDispute(@Body() dto: any) {
    return this.service.raiseDispute(dto);
  }

  @Patch('disputes/:id/resolve')
  resolveDispute(@Param('id') id: string, @Body() body: any) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid dispute ID');
    return this.service.resolveDispute(id, body);
  }

  // ===== DASHBOARD =====
  @Get('dashboard/stats')
  stats() {
    return this.service.dashboardStats();
  }
}
