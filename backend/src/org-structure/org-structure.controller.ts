import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { OrgStructureService } from './org-structure.service';
import { CreateDepartmentDto } from './dto/create-dep.dto';
import { UpdateDepartmentDto } from './dto/update-dep.dto';
import { CreatePositionDto } from './dto/create-pos.dto';
import { UpdatePositionDto } from './dto/update-pos.dto';

@Controller('org-structure')
export class OrgStructureController {
  constructor(private readonly svc: OrgStructureService) {}

  // ---------------------
  // DEPARTMENTS
  // ---------------------
  @Post('departments')
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.svc.createDepartment(dto);
  }

  @Get('departments')
  getDepartments() {
    return this.svc.getDepartments();
  }

  @Get('departments/:id')
  getDepartment(@Param('id') id: string) {
    return this.svc.getDepartment(id);
  }

  @Patch('departments/:id')
  updateDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.svc.updateDepartment(id, dto);
  }

  @Patch('departments/:id/deactivate')
  deactivateDepartment(@Param('id') id: string) {
    return this.svc.deactivateDepartment(id);
  }

  // ---------------------
  // POSITIONS
  // ---------------------
  @Post('positions')
  createPosition(@Body() dto: CreatePositionDto) {
    return this.svc.createPosition(dto);
  }

  @Get('positions')
  getPositions() {
    return this.svc.getPositions();
  }

  @Get('positions/:id')
  getPosition(@Param('id') id: string) {
    return this.svc.getPosition(id);
  }

  @Patch('positions/:id')
  updatePosition(
    @Param('id') id: string,
    @Body() dto: UpdatePositionDto,
  ) {
    return this.svc.updatePosition(id, dto);
  }

  @Patch('positions/:id/deactivate')
  deactivatePosition(@Param('id') id: string) {
    return this.svc.deactivatePosition(id);
  }

  @Patch('positions/:id/mark-filled')
  markFilled(@Param('id') id: string) {
    return this.svc.markPositionFilled(id);
  }

  @Patch('positions/:id/mark-vacant')
  markVacant(@Param('id') id: string) {
    return this.svc.markPositionVacant(id);
  }

  @Get('positions-tree')
  getTree() {
    return this.svc.getTree();
  }
}
