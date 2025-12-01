import { SystemRole } from '../employee-profile/enums/employee-profile.enums';

export interface AuthUser {
  userId: string;
  email: string;
  role: SystemRole;
  employeeId?: string;
  departmentId?: string;
  positionId?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: SystemRole;
}