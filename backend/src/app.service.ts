import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Welcome to HR Management System';
  }

  healthCheck(): { status: string; message: string } {
    return {
      status: 'healthy',
      message: 'Application is running successfully',
    };
  }

  getStatus(): { status: string; timestamp: string } {
    return {
      status: 'active',
      timestamp: new Date().toISOString(),
    };
  }

  // HR Admin Dashboard - Manages Employee Profiles, Org Structure, Performance
  getHrAdminDashboard(): object {
    return {
      dashboardType: 'HR Admin',
      timestamp: new Date().toISOString(),
      sections: {
        employeeProfile: {
          description: 'Central repository for all employee master data',
          features: [
            'View employee profiles',
            'Manage personal details',
            'Review profile change requests',
            'Approve employee updates',
            'Access historical records',
          ],
          status: 'active',
        },
        organizationStructure: {
          description: 'Define departments, positions, and reporting lines',
          features: [
            'Create/update departments',
            'Create/update positions',
            'Manage reporting hierarchies',
            'Deactivate obsolete positions',
            'Review org change requests',
          ],
          status: 'active',
        },
        performance: {
          description: 'Manage appraisal cycles and employee evaluations',
          features: [
            'Set up appraisal templates',
            'Configure appraisal cycles',
            'Monitor evaluation progress',
            'Review performance results',
            'Handle disputes and appeals',
          ],
          status: 'active',
        },
        pendingApprovals: {
          employeeProfileChanges: 0,
          orgStructureChanges: 0,
          performanceDisputes: 0,
        },
      },
    };
  }

  // Manager Dashboard - Performance, Team Insights, Leaves
  getManagerDashboard(): object {
    return {
      dashboardType: 'Department Manager',
      timestamp: new Date().toISOString(),
      sections: {
        teamInsights: {
          description: 'View team summary and attendance',
          features: [
            'View team members',
            'Monitor attendance',
            'Track leave requests',
            'Review time management',
          ],
          status: 'active',
        },
        performance: {
          description: 'Evaluate and manage team performance',
          features: [
            'Conduct employee appraisals',
            'Provide performance ratings',
            'Add development recommendations',
            'Review team performance trends',
          ],
          status: 'active',
        },
        leaveManagement: {
          description: 'Approve/reject team leave requests',
          features: [
            'Review leave requests',
            'Approve/reject requests',
            'Delegate approvals during absence',
            'Monitor leave balances',
          ],
          status: 'active',
        },
        pendingActions: {
          leaveRequests: 0,
          appraisals: 0,
          attendanceCorrections: 0,
        },
      },
    };
  }

  // Employee Dashboard - Personal Profile, Leave Balance, Payslips
  getEmployeeDashboard(): object {
    return {
      dashboardType: 'Employee',
      timestamp: new Date().toISOString(),
      sections: {
        profile: {
          description: 'View and update personal profile information',
          features: [
            'View profile details',
            'Update contact information',
            'Upload profile picture',
            'Request profile changes',
            'View employment history',
          ],
          status: 'active',
        },
        leaves: {
          description: 'Manage leave requests and track balance',
          features: [
            'Submit leave requests',
            'View leave balance',
            'Track request status',
            'Cancel leave requests',
            'Upload supporting documents',
          ],
          status: 'active',
        },
        payroll: {
          description: 'Access payslips and salary information',
          features: [
            'View payslips',
            'Download tax certificates',
            'Track earnings and deductions',
            'Submit payroll disputes',
            'View historical records',
          ],
          status: 'active',
        },
        attendance: {
          description: 'Track attendance and time records',
          features: [
            'Clock in/out',
            'Request attendance corrections',
            'View attendance history',
            'Monitor overtime',
          ],
          status: 'active',
        },
        myMetrics: {
          currentLeaveBalance: 0,
          pendingRequests: 0,
          upcomingAppraisals: 0,
        },
      },
    };
  }

  // Payroll Dashboard - Configuration, Processing, Tracking
  getPayrollDashboard(): object {
    return {
      dashboardType: 'Payroll',
      timestamp: new Date().toISOString(),
      sections: {
        payrollConfiguration: {
          description: 'Set up payroll policies and structures',
          features: [
            'Define salary structures',
            'Configure allowances/deductions',
            'Set tax rules',
            'Configure insurance brackets',
            'Manage pay grades',
          ],
          status: 'active',
        },
        payrollExecution: {
          description: 'Process monthly payroll runs',
          features: [
            'Initiate payroll',
            'Generate draft payroll',
            'Review and approve payroll',
            'Lock payroll cycle',
            'Generate payslips',
          ],
          status: 'active',
        },
        payrollTracking: {
          description: 'Monitor and report payroll activities',
          features: [
            'View payroll reports',
            'Generate compliance reports',
            'Handle disputes and claims',
            'Process refunds',
          ],
          status: 'active',
        },
        payrollMetrics: {
          employeesProcessed: 0,
          pendingApprovals: 0,
          disputesOpen: 0,
          refundsProcessed: 0,
        },
      },
    };
  }

  // Recruitment Dashboard - Job Postings, Candidates, Onboarding
  getRecruitmentDashboard(): object {
    return {
      dashboardType: 'Recruitment & Onboarding',
      timestamp: new Date().toISOString(),
      sections: {
        recruitment: {
          description: 'Manage job postings and candidate pipeline',
          features: [
            'Create job postings',
            'Track applications',
            'Evaluate candidates',
            'Generate job offers',
            'Manage offer acceptance',
          ],
          status: 'active',
        },
        onboarding: {
          description: 'Streamline new hire integration',
          features: [
            'Create onboarding checklists',
            'Collect documentation',
            'Provision access',
            'Assign resources',
            'Initiate payroll setup',
          ],
          status: 'active',
        },
        offboarding: {
          description: 'Manage compliant employee separations',
          features: [
            'Manage resignations/terminations',
            'Clearance workflows',
            'Revoke access',
            'Final settlements',
            'Asset recovery',
          ],
          status: 'active',
        },
        recruitmentMetrics: {
          openPositions: 0,
          activeApplications: 0,
          offersExtended: 0,
          onboardingInProgress: 0,
        },
      },
    };
  }

  // System Admin Dashboard - Complete System Overview
  getAdminDashboard(): object {
    return {
      dashboardType: 'System Administrator',
      timestamp: new Date().toISOString(),
      sections: {
        systemOverview: {
          description: 'Complete system health and configuration',
          features: [
            'Monitor system performance',
            'View audit logs',
            'Manage user access',
            'Configure system settings',
            'Manage backup routines',
          ],
          status: 'active',
        },
        allModules: {
          features: [
            'Employee Profile Management',
            'Organization Structure',
            'Performance Management',
            'Time Management',
            'Leave Management',
            'Recruitment & Onboarding',
            'Payroll Configuration',
            'Payroll Execution',
            'Payroll Tracking',
          ],
          status: 'active',
        },
        integrations: {
          description: 'Manage system integrations and data sync',
          features: [
            'Monitor module integrations',
            'Verify data consistency',
            'Manage backup and recovery',
            'Configure system integrations',
          ],
          status: 'active',
        },
        systemMetrics: {
          totalUsers: 0,
          activeModules: 9,
          systemUptime: '100%',
          lastBackup: new Date().toISOString(),
          dataIntegrity: 'verified',
        },
      },
    };
  }
}