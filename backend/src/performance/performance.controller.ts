import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PerformanceService } from './performance.service';

@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Post('setup')
  setupAppraisal(@Body() body: any) {
    return this.performanceService.setupAppraisal(body);
  }

  @Post('evaluate/:employeeId')
  evaluateEmployee(@Param('employeeId') employeeId: string, @Body() body: any) {
    return this.performanceService.evaluateEmployee(employeeId, body);
  }

  @Get('evaluations')
  getAllEvaluations() {
    return this.performanceService.getAllEvaluations();
  }

  @Get('feedback/:employeeId')
  getFeedback(@Param('employeeId') employeeId: string) {
    return this.performanceService.getFeedback(employeeId);
  }

  @Post('dispute/:employeeId')
  submitDispute(@Param('employeeId') employeeId: string, @Body() body: any) {
    return this.performanceService.submitDispute(employeeId, body);
  }

  @Post('archive')
  archiveAppraisals(@Body() body: any) {
    return this.performanceService.archiveAppraisals(body);
  }
}
