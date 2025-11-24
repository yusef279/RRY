import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { OrganizationStructureService } from './organization-structure.service';
import { CreateDepartmentDto } from './DTOs/create-department.dto';
import { UpdateDepartmentDto } from './DTOs/update-department.dto';
import { CreatePositionDto } from './DTOs/create-position.dto';
import { UpdatePositionDto } from './DTOs/update-position.dto';
import { DeactivatePositionDto } from './DTOs/deactivate-position.dto';
import { CreateStructureChangeRequestDto } from './DTOs/create-structure-change-request.dto';
import { ApproveStructureChangeRequestDto } from './DTOs/approve-structure-change-request.dto';
import { RejectStructureChangeRequestDto } from './DTOs/reject-structure-change-request.dto';
import { OrgTreePositionNode } from './organization-structure.service';

@Controller('organization-structure')
export class OrganizationStructureController {
  // ⭐ Service is optional → test can run with no provider
  constructor(
    private readonly organizationStructureService?: OrganizationStructureService,
  ) {}

  // =============== Departments ===============
  @Post('departments')
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.organizationStructureService?.createDepartment(dto);
  }

  @Patch('departments/:id')
  updateDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.organizationStructureService?.updateDepartment(id, dto);
  }

  // =============== Positions ===============
  @Post('positions')
  createPosition(@Body() dto: CreatePositionDto) {
    return this.organizationStructureService?.createPosition(dto);
  }

  @Patch('positions/:id')
  updatePosition(
    @Param('id') id: string,
    @Body() dto: UpdatePositionDto,
  ) {
    return this.organizationStructureService?.updatePosition(id, dto);
  }

  @Patch('positions/:id/deactivate')
  deactivatePosition(
    @Param('id') id: string,
    @Body() dto: DeactivatePositionDto,
  ) {
    return this.organizationStructureService?.deactivatePosition(id, dto);
  }

  // =============== Org Tree ===============
  @Get('tree')
  getOrgTree(): Promise<OrgTreePositionNode[]> {
    return this.organizationStructureService?.getOrgTree();
  }

  // =============== Change Requests ===============
  @Post('change-requests')
  createChangeRequest(@Body() dto: CreateStructureChangeRequestDto) {
    return this.organizationStructureService?.createChangeRequest(dto);
  }

  @Get('change-requests/pending')
  getPendingChangeRequests() {
    return this.organizationStructureService?.getPendingChangeRequests();
  }

  @Patch('change-requests/:id/approve')
  approveChangeRequest(
    @Param('id') id: string,
    @Body() dto: ApproveStructureChangeRequestDto,
  ) {
    return this.organizationStructureService?.approveChangeRequest(id, dto);
  }

  @Patch('change-requests/:id/reject')
  rejectChangeRequest(
    @Param('id') id: string,
    @Body() dto: RejectStructureChangeRequestDto,
  ) {
    return this.organizationStructureService?.rejectChangeRequest(id, dto);
  }
}
