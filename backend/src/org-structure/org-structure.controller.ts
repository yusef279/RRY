import { Controller, Post, Patch, Get, Body, Param } from '@nestjs/common';
import { OrgStructureService } from './org-structure.service';

@Controller('org-structure')
export class OrgStructureController {
  constructor(private svc: OrgStructureService) {}

  @Post('dept')
  createDept(@Body() body: any) {
    return this.svc.createDept(body);
  }

  @Post('pos')
  createPos(@Body() body: any) {
    return this.svc.createPos(body);
  }

  @Patch('pos/:id/report')
  changeBoss(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateReportingLine(id, body.reportsTo);
  }

  @Patch('pos/:id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.svc.deactivatePosition(id);
  }

  @Patch('dept/:id')
  rename(@Param('id') id: string, @Body() body: any) {
    return this.svc.renameDept(id, body.name);
  }

  @Get('chart')
  chart() {
    return this.svc.getOrgChart();
  }
}
