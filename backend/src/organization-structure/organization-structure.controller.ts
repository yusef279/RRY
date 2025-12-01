import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  BadRequestException,
  UseGuards,
  Req,
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

// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
import { Permissions } from '../auth/decorators/roles.decorators';
import { Permission } from '../auth/permissions.constant';
import { Request } from 'express';
import { AuthUser } from '../auth/auth-user.interface';

@Controller('organization-structure')
// @UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationStructureController {
  constructor(private readonly service: OrganizationStructureService) {}

  // -------------------------------------------------------------
  // DEPARTMENTS
  // -------------------------------------------------------------

  @Post('departments')
  @Permissions(Permission.MANAGE_ORG_STRUCTURE)
  createDepartment(
    @Body() dto: CreateDepartmentDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    dto.performedByEmployeeId = req.user.employeeId!;
    return this.service.createDepartment(dto);
  }

  @Patch('departments/:id')
  @Permissions(Permission.MANAGE_ORG_STRUCTURE)
  updateDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    dto.performedByEmployeeId = req.user.employeeId!;
    return this.service.updateDepartment(id, dto);
  }

  @Get('departments')
  @Permissions(Permission.VIEW_ORG_STRUCTURE)
  listDepartments() {
    return this.service.listDepartments();
  }

  @Get('departments/:id')
  @Permissions(Permission.VIEW_ORG_STRUCTURE)
  getDepartment(@Param('id') id: string) {
    return this.service.getDepartment(id);
  }

  // -------------------------------------------------------------
  // POSITIONS
  // -------------------------------------------------------------

  @Post('positions')
  @Permissions(Permission.MANAGE_ORG_STRUCTURE)
  createPosition(
    @Body() dto: CreatePositionDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    dto.performedByEmployeeId = req.user.employeeId!;
    return this.service.createPosition(dto);
  }

  @Patch('positions/:id')
  @Permissions(Permission.MANAGE_ORG_STRUCTURE)
  updatePosition(
    @Param('id') id: string,
    @Body() dto: UpdatePositionDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    dto.performedByEmployeeId = req.user.employeeId!;
    return this.service.updatePosition(id, dto);
  }

  @Patch('positions/:id/deactivate')
  @Permissions(Permission.MANAGE_ORG_STRUCTURE)
  deactivatePosition(
    @Param('id') id: string,
    @Body() dto: DeactivatePositionDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    dto.performedByEmployeeId = req.user.employeeId!;
    return this.service.deactivatePosition(id, dto);
  }

  @Get('positions')
  @Permissions(Permission.VIEW_ORG_STRUCTURE)
  listPositions() {
    return this.service.listPositions();
  }

  @Get('positions/:id')
  @Permissions(Permission.VIEW_ORG_STRUCTURE)
  getPosition(@Param('id') id: string) {
    return this.service.getPosition(id);
  }

  // -------------------------------------------------------------
  // TREE (BR 41)
  // -------------------------------------------------------------

  @Get('tree')
  @Permissions(Permission.VIEW_ORG_STRUCTURE)
  getFullOrgTree() {
    return this.service.getOrgTree();
  }

  @Get('tree/employee')
  @Permissions(Permission.VIEW_ORG_STRUCTURE)
  getEmployeeTree(
    @Query('employeeId') employeeId: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    if (!employeeId) throw new BadRequestException('employeeId required');
    return this.service.getEmployeeTree(employeeId, req.user);
  }

  @Get('tree/manager')
  @Permissions(Permission.VIEW_TEAM_PROFILES, Permission.VIEW_ORG_STRUCTURE)
  getManagerTree(
    @Query('managerEmployeeId') managerId: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    if (!managerId)
      throw new BadRequestException('managerEmployeeId required');
    return this.service.getManagerTree(managerId, req.user);
  }

  // -------------------------------------------------------------
  // CHANGE REQUESTS
  // -------------------------------------------------------------

  @Post('change-requests')
  @Permissions(Permission.VIEW_ORG_STRUCTURE)
  createChangeRequest(
    @Body() dto: CreateStructureChangeRequestDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    dto.requestedByEmployeeId = req.user.employeeId!;
    return this.service.createChangeRequest(dto);
  }

  @Get('change-requests/pending')
  @Permissions(Permission.MANAGE_ORG_STRUCTURE)
  getPendingChangeRequests() {
    return this.service.getPendingChangeRequests();
  }

  @Get('change-requests/:id')
  @Permissions(Permission.VIEW_ORG_STRUCTURE)
  getChangeRequest(@Param('id') id: string) {
    return this.service.getChangeRequest(id);
  }

  @Post('change-requests/:id/approve')
  @Permissions(Permission.MANAGE_ORG_STRUCTURE)
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveStructureChangeRequestDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    dto.approverEmployeeId = req.user.employeeId!;
    return this.service.approveChangeRequest(new Types.ObjectId(id), dto);
  }

  @Post('change-requests/:id/reject')
  @Permissions(Permission.MANAGE_ORG_STRUCTURE)
  reject(
    @Param('id') id: string,
    @Body() dto: RejectStructureChangeRequestDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    dto.approverEmployeeId = req.user.employeeId!;
    return this.service.rejectChangeRequest(new Types.ObjectId(id), dto);
  }
}
