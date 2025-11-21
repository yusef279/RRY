import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateProfileChangeRequestDto } from './dto/create-profile-change.dto';

@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  // ========== EMPLOYEE CRUD ==========

  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeeService.create(dto);
  }

  @Get()
  findAll() {
    return this.employeeService.findAll();
  }

  @Get('me/profile')
  getMyProfile(@Query('email') email: string) {
    return this.employeeService.findByEmail(email);
  }

  // ❗ keep all "profile-change" routes BEFORE ":id" so they don’t get treated as an id

  // ========== PROFILE CHANGE (EMPLOYEE + HR) ==========

  // Employee creates request
  @Post('profile-change')
  requestProfileChange(@Body() body: CreateProfileChangeRequestDto) {
    return this.employeeService.requestProfileChange(body);
  }

  // HR: list requests (optionally filter by status / employeeId)
  @Get('profile-change')
  listProfileChangeRequests(
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.employeeService.listProfileChangeRequests(status, employeeId);
  }

  // HR: view single request
  @Get('profile-change/:id')
  getProfileChangeRequest(@Param('id') id: string) {
    return this.employeeService.getProfileChangeRequest(id);
  }

  // HR: approve
  @Patch('profile-change/:id/approve')
  approveProfileChange(@Param('id') id: string) {
    return this.employeeService.approveProfileChangeRequest(id);
  }

  // HR: reject
  @Patch('profile-change/:id/reject')
  rejectProfileChange(@Param('id') id: string) {
    return this.employeeService.rejectProfileChangeRequest(id);
  }

  // ========== SINGLE EMPLOYEE BY ID (PUT THIS LAST!) ==========

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeeService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeeService.update(id, dto);
  }
}
