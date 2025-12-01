export enum Permission {
  // Profile Module
  MANAGE_ALL_PROFILES = 'MANAGE_ALL_PROFILES',
  VIEW_TEAM_PROFILES = 'VIEW_TEAM_PROFILES',
  EDIT_OWN_PROFILE = 'EDIT_OWN_PROFILE',

  // Organization Module
  MANAGE_ORG_STRUCTURE = 'MANAGE_ORG_STRUCTURE',
  VIEW_ORG_STRUCTURE = 'VIEW_ORG_STRUCTURE',

  // Performance Module
  MANAGE_APPRAISALS = 'MANAGE_APPRAISALS',
  CONDUCT_APPRAISALS = 'CONDUCT_APPRAISALS',
  VIEW_OWN_APPRAISAL = 'VIEW_OWN_APPRAISAL',

  // Time Management Module
  MANAGE_ATTENDANCE = 'MANAGE_ATTENDANCE',
  VIEW_TEAM_ATTENDANCE = 'VIEW_TEAM_ATTENDANCE',
  CLOCK_IN_OUT = 'CLOCK_IN_OUT',

  // Recruitment Module
  MANAGE_RECRUITMENT = 'MANAGE_RECRUITMENT',
  VIEW_APPLICATIONS = 'VIEW_APPLICATIONS',

  // Leaves Module
  MANAGE_LEAVES = 'MANAGE_LEAVES',
  APPROVE_LEAVES = 'APPROVE_LEAVES',
  REQUEST_LEAVE = 'REQUEST_LEAVE',

  // Payroll Module
  MANAGE_PAYROLL = 'MANAGE_PAYROLL',
  APPROVE_PAYROLL = 'APPROVE_PAYROLL',
  VIEW_OWN_PAYSLIP = 'VIEW_OWN_PAYSLIP',
}
import { SystemRole } from '../employee-profile/enums/employee-profile.enums';

export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  [SystemRole.SYSTEM_ADMIN]:
Object.values(Permission), 

  [SystemRole.HR_MANAGER]: [
    Permission.MANAGE_ALL_PROFILES,
    Permission.VIEW_ORG_STRUCTURE,
    Permission.MANAGE_APPRAISALS,
    Permission.MANAGE_ATTENDANCE,
    Permission.MANAGE_RECRUITMENT,
    Permission.MANAGE_LEAVES,
    Permission.APPROVE_PAYROLL,
  ],

  [SystemRole.HR_ADMIN]: [
    Permission.MANAGE_ALL_PROFILES,
    Permission.VIEW_ORG_STRUCTURE,
    Permission.MANAGE_ATTENDANCE,
    Permission.MANAGE_LEAVES,
  ],

  [SystemRole.HR_EMPLOYEE]: [
    Permission.MANAGE_ALL_PROFILES,
    Permission.VIEW_ORG_STRUCTURE,
    Permission.VIEW_APPLICATIONS,
  ],

  [SystemRole.PAYROLL_SPECIALIST]: [
    Permission.MANAGE_PAYROLL,
    Permission.VIEW_TEAM_ATTENDANCE,
  ],
  [SystemRole.PAYROLL_MANAGER]: [
  Permission.MANAGE_PAYROLL,
  Permission.APPROVE_PAYROLL,
  Permission.VIEW_TEAM_ATTENDANCE,
  Permission.VIEW_ORG_STRUCTURE,
],

  [SystemRole.FINANCE_STAFF]: [
    Permission.APPROVE_PAYROLL,
  ],

  [SystemRole.LEGAL_POLICY_ADMIN]: [
    Permission.MANAGE_PAYROLL, // For tax/legal config
  ],

  [SystemRole.RECRUITER]: [
    Permission.MANAGE_RECRUITMENT,
    Permission.VIEW_APPLICATIONS,
  ],

  [SystemRole.DEPARTMENT_HEAD]: [
    Permission.VIEW_TEAM_PROFILES,
    Permission.CONDUCT_APPRAISALS,
    Permission.VIEW_TEAM_ATTENDANCE,
    Permission.APPROVE_LEAVES,
  ],

  [SystemRole.DEPARTMENT_EMPLOYEE]: [
    Permission.EDIT_OWN_PROFILE,
    Permission.VIEW_ORG_STRUCTURE,
    Permission.VIEW_OWN_APPRAISAL,
    Permission.CLOCK_IN_OUT,
    Permission.REQUEST_LEAVE,
    Permission.VIEW_OWN_PAYSLIP,
  ],

  [SystemRole.JOB_CANDIDATE]: [
    Permission.VIEW_APPLICATIONS, // View own application
  ],
};

export { SystemRole as UserRole } from '../employee-profile/enums/employee-profile.enums';