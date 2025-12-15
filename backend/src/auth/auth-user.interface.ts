import { SystemRole } from '../employee-profile/enums/employee-profile.enums';
import { Permission } from './permissions.constant';

export interface AuthUser {
  userId: string;
  email: string;

  /** Primary role (kept for backward compatibility) */
  role: SystemRole;

  /** Multi-role support */
  roles?: SystemRole[];

  /** Optional: permissions embedded into JWT */
  permissions?: Permission[];

  employeeId?: string;
  departmentId?: string;
  positionId?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: SystemRole;
  roles?: SystemRole[];
  permissions?: Permission[];
  employeeId?: string;
  departmentId?: string;
  positionId?: string;

  iat?: number;
  exp?: number;
}
