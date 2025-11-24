import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
  constructor(
    private readonly service: OrganizationStructureService,
  ) {}

  // ------------------- STRUCTURE CREATION -------------------

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

  // ------------------- DEACTIVATION -------------------

  @Patch('positions/:id/deactivate')
  deactivatePosition(
    @Param('id') id: string,
    @Body() dto: DeactivatePositionDto,
  ) {
    return this.service.deactivatePosition(id, dto);
  }

  // ------------------- TREE VIEW -------------------

  @Get('tree')
  getOrgTree() {
    return this.service.getOrgTree();
  }

  // ------------------- APPROVAL WORKFLOW -------------------

  @Post('change-requests')
  createChangeRequest(
    @Body() dto: CreateStructureChangeRequestDto,
  ) {
    return this.service.createChangeRequest(dto);
  }

  @Get('change-requests/pending')
  getPending() {
    return this.service.getPendingChangeRequests();
  }

  @Post('change-requests/:id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveStructureChangeRequestDto,
  ) {
    return this.service.approveChangeRequest(
      new Types.ObjectId(id),
      dto,
    );
  }

  @Post('change-requests/:id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectStructureChangeRequestDto,
  ) {
    return this.service.rejectChangeRequest(
      new Types.ObjectId(id),
      dto,
    );
  }
}
