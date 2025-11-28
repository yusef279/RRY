import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import { OrganizationStructureService } from './organization-structure.service';

import { CreateDepartmentDto } from './DTOs/create-department.dto';
import { UpdateDepartmentDto } from './DTOs/update-department.dto';
import { CreatePositionDto } from './DTOs/create-position.dto';
import { UpdatePositionDto } from './DTOs/update-position.dto';
import { DeactivatePositionDto } from './DTOs/deactivate-position.dto';
import { CreateStructureChangeRequestDto } from './DTOs/create-structure-change-request.dto';
import { ApproveStructureChangeRequestDto } from './DTOs/approve-structure-change-request.dto';
import { RejectStructureChangeRequestDto } from './DTOs/reject-structure-change-request.dto';

@Controller('organization-structure')
export class OrganizationStructureController {
  constructor(private readonly service: OrganizationStructureService) {}

  // -------------------------------------------------------------
  // DEPARTMENTS
  // -------------------------------------------------------------

  @Post('departments')
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.service.createDepartment(dto);
  }

  @Patch('departments/:id')
  updateDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.service.updateDepartment(id, dto);
  }

  @Get('departments')
  listDepartments() {
    return this.service.listDepartments();
  }

  @Get('departments/:id')
  getDepartment(@Param('id') id: string) {
    return this.service.getDepartment(id);
  }

  // -------------------------------------------------------------
  // POSITIONS
  // -------------------------------------------------------------

  @Post('positions')
  createPosition(@Body() dto: CreatePositionDto) {
    return this.service.createPosition(dto);
  }

  @Patch('positions/:id')
  updatePosition(
    @Param('id') id: string,
    @Body() dto: UpdatePositionDto,
  ) {
    return this.service.updatePosition(id, dto);
  }

  @Patch('positions/:id/deactivate')
  deactivatePosition(
    @Param('id') id: string,
    @Body() dto: DeactivatePositionDto,
  ) {
    return this.service.deactivatePosition(id, dto);
  }

  @Get('positions')
  listPositions() {
    return this.service.listPositions();
  }

  @Get('positions/:id')
  getPosition(@Param('id') id: string) {
    return this.service.getPosition(id);
  }

  // -------------------------------------------------------------
  // TREE & VISIBILITY (REQ-SANV-01/02)
  // -------------------------------------------------------------

  @Get('tree')
  getFullOrgTree() {
    return this.service.getOrgTree();
  }

  // Employee view: their subtree (REQ-SANV-01)
  @Get('tree/employee')
  getEmployeeTree(@Query('employeeId') employeeId: string) {
    if (!employeeId) throw new BadRequestException('employeeId required');
    return this.service.getEmployeeTree(employeeId);
  }

  // Manager view: their team only (REQ-SANV-02)
  @Get('tree/manager')
  getManagerTree(@Query('managerEmployeeId') managerId: string) {
    if (!managerId) throw new BadRequestException('managerEmployeeId required');
    return this.service.getManagerTree(managerId);
  }

  // -------------------------------------------------------------
  // CHANGE REQUEST WORKFLOW
  // -------------------------------------------------------------

  @Post('change-requests')
  createChangeRequest(@Body() dto: CreateStructureChangeRequestDto) {
    return this.service.createChangeRequest(dto);
  }

  @Get('change-requests/pending')
  getPendingChangeRequests() {
    return this.service.getPendingChangeRequests();
  }

  @Get('change-requests/:id')
  getChangeRequest(@Param('id') id: string) {
    return this.service.getChangeRequest(id);
  }

  @Post('change-requests/:id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveStructureChangeRequestDto,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid request ID');
    }
    return this.service.approveChangeRequest(new Types.ObjectId(id), dto);
  }

  @Post('change-requests/:id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectStructureChangeRequestDto,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid request ID');
    }
    return this.service.rejectChangeRequest(new Types.ObjectId(id), dto);
  }
}
