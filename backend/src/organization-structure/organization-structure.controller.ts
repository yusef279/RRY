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

import {
  JwtAuthGuard,
  PermissionsGuard,
  Permissions,
  CurrentUser,
} from '../auth';
import { Permission } from '../auth';
import type { AuthUser } from '../auth';

@Controller('organization-structure')
@UseGuards(JwtAuthGuard)
export class OrganizationStructureController {
  constructor(private readonly service: OrganizationStructureService) {}

  // -------------------------------------------------------------
  // DEPARTMENTS
  // -------------------------------------------------------------

  @Post('departments')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ORG_STRUCTURE)
  createDepartment(@Body() dto: CreateDepartmentDto, @CurrentUser() user: AuthUser) {
    dto.performedByEmployeeId = user.employeeId!;
    return this.service.createDepartment(dto);
  }

  @Patch('departments/:id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ORG_STRUCTURE)
  updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto, @CurrentUser() user: AuthUser) {
    dto.performedByEmployeeId = user.employeeId!;
    return this.service.updateDepartment(id, dto);
  }

  @Get('departments')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.VIEW_ORG_STRUCTURE)
  listDepartments() {
    return this.service.listDepartments();
  }

  @Get('departments/:id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.VIEW_ORG_STRUCTURE)
  getDepartment(@Param('id') id: string) {
    return this.service.getDepartment(id);
  }

  // -------------------------------------------------------------
  // POSITIONS
  // -------------------------------------------------------------

  @Post('positions')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ORG_STRUCTURE)
  createPosition(@Body() dto: CreatePositionDto, @CurrentUser() user: AuthUser) {
    dto.performedByEmployeeId = user.employeeId!;
    return this.service.createPosition(dto);
  }

  @Patch('positions/:id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ORG_STRUCTURE)
  updatePosition(@Param('id') id: string, @Body() dto: UpdatePositionDto, @CurrentUser() user: AuthUser) {
    dto.performedByEmployeeId = user.employeeId!;
    return this.service.updatePosition(id, dto);
  }

  @Patch('positions/:id/deactivate')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ORG_STRUCTURE)
  deactivatePosition(
    @Param('id') id: string,
    @Body() dto: DeactivatePositionDto,
    @CurrentUser() user: AuthUser,
  ) {
    // if frontend sends no body, dto will be undefined
    const safeDto: DeactivatePositionDto = (dto ?? ({} as DeactivatePositionDto));
    safeDto.performedByEmployeeId = user.employeeId!;
    return this.service.deactivatePosition(id, safeDto);
  }


  @Get('positions')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.VIEW_ORG_STRUCTURE)
  listPositions() {
    return this.service.listPositions();
  }

  @Get('positions/:id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.VIEW_ORG_STRUCTURE)
  getPosition(@Param('id') id: string) {
    return this.service.getPosition(id);
  }

  // -------------------------------------------------------------
  // TREE (BR 41)
  // -------------------------------------------------------------

  @Get('tree')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.VIEW_ORG_STRUCTURE)
  getFullOrgTree() {
    return this.service.getOrgTree();
  }

  @Get('tree/employee')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.VIEW_ORG_STRUCTURE)
  getEmployeeTree(@Query('employeeId') employeeId: string, @CurrentUser() user: AuthUser) {
    if (!employeeId) throw new BadRequestException('employeeId required');
    return this.service.getEmployeeTree(employeeId, user);
  }

  @Get('tree/manager')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.VIEW_TEAM_PROFILES, Permission.VIEW_ORG_STRUCTURE)
  getManagerTree(@Query('managerEmployeeId') managerId: string, @CurrentUser() user: AuthUser) {
    if (!managerId)
      throw new BadRequestException('managerEmployeeId required');
    return this.service.getManagerTree(managerId, user);
  }

  // -------------------------------------------------------------
  // CHANGE REQUESTS
  // -------------------------------------------------------------

  @Post('change-requests')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.VIEW_ORG_STRUCTURE)
  createChangeRequest(@Body() dto: CreateStructureChangeRequestDto, @CurrentUser() user: AuthUser) {
    dto.requestedByEmployeeId = user.employeeId!;
    return this.service.createChangeRequest(dto);
  }

  @Get('change-requests/pending')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ORG_STRUCTURE)
  getPendingChangeRequests() {
    return this.service.getPendingChangeRequests();
  }

  @Get('change-requests/:id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.VIEW_ORG_STRUCTURE)
  getChangeRequest(@Param('id') id: string) {
    return this.service.getChangeRequest(id);
  }

  @Post('change-requests/:id/approve')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ORG_STRUCTURE)
  approve(@Param('id') id: string, @Body() dto: ApproveStructureChangeRequestDto, @CurrentUser() user: AuthUser) {
    dto.approverEmployeeId = user.employeeId!;
    return this.service.approveChangeRequest(new Types.ObjectId(id), dto);
  }

  @Post('change-requests/:id/reject')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ORG_STRUCTURE)
  reject(@Param('id') id: string, @Body() dto: RejectStructureChangeRequestDto, @CurrentUser() user: AuthUser) {
    dto.approverEmployeeId = user.employeeId!;
    return this.service.rejectChangeRequest(new Types.ObjectId(id), dto);
  }
}
