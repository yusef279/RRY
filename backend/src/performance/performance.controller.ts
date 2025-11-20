import { Controller, Post, Body, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './roles.decorater';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('performance')
export class PerformanceController {
  constructor(private readonly service: PerformanceService) {}

  // ============ TEMPLATES ============
  @Post('templates')
  @Roles('HR')
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @Get('templates')
  listTemplates() {
    return this.service.listTemplates();
  }

  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.service.getTemplate(id);
  }

  // ============ CYCLES ============
  @Post('cycles')
  @Roles('HR')
  createCycle(@Body() dto: CreateCycleDto) {
    return this.service.createCycle(dto);
  }

  @Get('cycles')
  listCycles() {
    return this.service.listCycles();
  }

  @Patch('cycles/:id/assign')
  @Roles('HR', 'Manager')
  assignEmployees(@Param('id') id: string, @Body('employeeIds') employeeIds: string[]) {
    return this.service.assignEmployees(id, employeeIds || []);
  }

  @Patch('cycles/:id/status')
  @Roles('HR')
  updateCycleStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.service.updateCycleStatus(id, status);
  }

  // ============ EVALUATIONS ============
  @Post('evaluations')
  @Roles('Manager')
  createEvaluation(@Body() dto: CreateEvaluationDto) {
    return this.service.createEvaluation(dto);
  }

  @Patch('evaluations/:id/submit')
  @Roles('Manager')
  submitEvaluation(@Param('id') id: string) {
    return this.service.submitEvaluation(id);
  }

  @Patch('evaluations/:id/publish')
  @Roles('HR')
  publishEvaluation(@Param('id') id: string) {
    return this.service.publishEvaluation(id);
  }

  @Patch('evaluations/:id/acknowledge')
  @Roles('Employee')
  acknowledgeEvaluation(@Param('id') id: string, @Body('employeeId') employeeId: string) {
    return this.service.acknowledgeEvaluation(id, employeeId);
  }

  @Get('evaluations/employee/:id')
  @Roles('Employee', 'Manager', 'HR')
  listEvaluationsForEmployee(@Param('id') id: string) {
    return this.service.listEvaluationsForEmployee(id);
  }

  @Get('evaluations/:id')
  @Roles('Employee', 'Manager', 'HR')
  getEvaluation(@Param('id') id: string) {
    return this.service.getEvaluation(id);
  }

  // ============ DISPUTES ============
  @Post('evaluations/:id/dispute')
  @Roles('Employee')
  createDispute(@Param('id') evaluationId: string, @Body() dto: CreateDisputeDto) {
    dto.evaluationId = evaluationId;
    return this.service.createDispute(dto);
  }

  @Get('disputes')
  @Roles('HR')
  listDisputes() {
    return this.service.listDisputes();
  }

  @Patch('disputes/:id/resolve')
  @Roles('HR')
  resolveDispute(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.service.resolveDispute(id, dto);
  }
}