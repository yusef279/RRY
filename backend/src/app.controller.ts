import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Permissions } from './auth/decorators/roles.decorators';
import { Public } from './auth/decorators/roles.decorators';
import { Permission } from './auth/permissions.constant';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  healthCheck(): { status: string; message: string } {
    return this.appService.healthCheck();
  }

  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  getStatus(): { status: string; timestamp: string } {
    return this.appService.getStatus();
  }

  // HR Admin Dashboard - Employee Profile, Org Structure, Performance
  @Get('dashboard/hr-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions(
    Permission.MANAGE_ALL_PROFILES,
    Permission.MANAGE_ORG_STRUCTURE,
    Permission.MANAGE_APPRAISALS,
  )
  getHrAdminDashboard(): object {
    return this.appService.getHrAdminDashboard();
  }

  // Manager Dashboard - Performance, Team Insights, Org Structure
  @Get('dashboard/manager')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions(
    Permission.VIEW_TEAM_PROFILES,
    Permission.CONDUCT_APPRAISALS,
    Permission.APPROVE_LEAVES,
  )
  getManagerDashboard(): object {
    return this.appService.getManagerDashboard();
  }

  // Employee Dashboard - Profile, Performance, Leaves, Payroll
  @Get('dashboard/employee')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions(
    Permission.EDIT_OWN_PROFILE,
    Permission.REQUEST_LEAVE,
    Permission.VIEW_OWN_PAYSLIP,
    Permission.CLOCK_IN_OUT,
  )
  getEmployeeDashboard(): object {
    return this.appService.getEmployeeDashboard();
  }

  // Payroll Dashboard - Payroll Configuration, Processing, Tracking
  @Get('dashboard/payroll')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions(
    Permission.MANAGE_PAYROLL,
    Permission.APPROVE_PAYROLL,
    Permission.VIEW_TEAM_ATTENDANCE,
  )
  getPayrollDashboard(): object {
    return this.appService.getPayrollDashboard();
  }

  // Recruitment Dashboard - Job Postings, Candidates, Onboarding
  @Get('dashboard/recruitment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions(Permission.MANAGE_RECRUITMENT, Permission.VIEW_APPLICATIONS)
  getRecruitmentDashboard(): object {
    return this.appService.getRecruitmentDashboard();
  }

  // System Admin Dashboard - Complete System Overview
  @Get('dashboard/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions(Permission.MANAGE_ALL_PROFILES, Permission.MANAGE_ORG_STRUCTURE)
  getAdminDashboard(): object {
    return this.appService.getAdminDashboard();
  }
}