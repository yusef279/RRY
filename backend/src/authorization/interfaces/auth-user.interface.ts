import { UserRole } from '../constants/roles.constant';
export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  employeeId?: string;
  departmentId?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}