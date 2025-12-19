export enum Permission {
  // Profile Module
  MANAGE_ALL_PROFILES = 'MANAGE_ALL_PROFILES',
  VIEW_TEAM_PROFILES = 'VIEW_TEAM_PROFILES',
  EDIT_OWN_PROFILE = 'EDIT_OWN_PROFILE',

  // Organization Module
  MANAGE_ORG_STRUCTURE = 'MANAGE_ORG_STRUCTURE',
  VIEW_ORG_STRUCTURE = 'VIEW_ORG_STRUCTURE',

  // Performance Module
  MANAGE_APPRAISALS = 'MANAGE_APPRAISALS',               // steps 1, 2, 4, 7
  CONDUCT_APPRAISALS = 'CONDUCT_APPRAISALS',             // step 3B
  VIEW_OWN_APPRAISAL = 'VIEW_OWN_APPRAISAL',             // step 5
  RAISE_DISPUTE = 'RAISE_DISPUTE',                       // step 6
  RESOLVE_DISPUTE = 'RESOLVE_DISPUTE',                   // step 7
  VIEW_APPRAISAL_DASHBOARD = 'VIEW_APPRAISAL_DASHBOARD', // step 4  (consolidated view)
  EXPORT_APPRAISAL_REPORTS = 'EXPORT_APPRAISAL_REPORTS', // step 7  (final reports)

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
    Permission.EDIT_OWN_PROFILE, // ← add this
    Permission.VIEW_ORG_STRUCTURE,
    Permission.VIEW_OWN_APPRAISAL, // ← add this
    Permission.MANAGE_APPRAISALS,
    Permission.VIEW_APPRAISAL_DASHBOARD,
    Permission.EXPORT_APPRAISAL_REPORTS,
    Permission.RESOLVE_DISPUTE,
    Permission.MANAGE_ATTENDANCE,
    Permission.MANAGE_RECRUITMENT,
    Permission.MANAGE_LEAVES,
    Permission.APPROVE_PAYROLL,
    Permission.EDIT_OWN_PROFILE,
    Permission.VIEW_TEAM_PROFILES,
  ],

  [SystemRole.HR_ADMIN]: [
    Permission.MANAGE_ALL_PROFILES,
    Permission.VIEW_ORG_STRUCTURE,
    // Permission.MANAGE_APPRAISALS,
    // Permission.VIEW_APPRAISAL_DASHBOARD,
    // Permission.VIEW_OWN_APPRAISAL,
    // Permission.EXPORT_APPRAISAL_REPORTS,
    // Permission.RESOLVE_DISPUTE,
    Permission.MANAGE_ATTENDANCE,
    Permission.MANAGE_LEAVES,
    Permission.EDIT_OWN_PROFILE,
  ],

  [SystemRole.HR_EMPLOYEE]: [
    Permission.EDIT_OWN_PROFILE,
    Permission.MANAGE_ALL_PROFILES,
    Permission.VIEW_ORG_STRUCTURE,
    Permission.VIEW_APPLICATIONS,
    Permission.VIEW_OWN_APPRAISAL,
    Permission.CONDUCT_APPRAISALS,
    Permission.MANAGE_APPRAISALS,
    Permission.VIEW_APPRAISAL_DASHBOARD,
  ],

  [SystemRole.PAYROLL_SPECIALIST]: [
    Permission.MANAGE_PAYROLL,
    Permission.VIEW_TEAM_ATTENDANCE,
    Permission.APPROVE_PAYROLL,
    Permission.VIEW_ORG_STRUCTURE,
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
    Permission.EDIT_OWN_PROFILE,
    Permission.VIEW_OWN_APPRAISAL,
    Permission.CONDUCT_APPRAISALS,
    Permission.MANAGE_APPRAISALS,
    Permission.VIEW_TEAM_ATTENDANCE,
    Permission.APPROVE_LEAVES,
  ],

  [SystemRole.DEPARTMENT_EMPLOYEE]: [
    Permission.EDIT_OWN_PROFILE,
    Permission.VIEW_ORG_STRUCTURE,
    Permission.VIEW_OWN_APPRAISAL,
    Permission.CONDUCT_APPRAISALS,
    Permission.RAISE_DISPUTE,
    Permission.CLOCK_IN_OUT,
    Permission.REQUEST_LEAVE,
    Permission.VIEW_OWN_PAYSLIP,
  ],

  [SystemRole.JOB_CANDIDATE]: [
    Permission.VIEW_APPLICATIONS, // View own application
  ],
};

export { SystemRole as UserRole } from '../employee-profile/enums/employee-profile.enums';