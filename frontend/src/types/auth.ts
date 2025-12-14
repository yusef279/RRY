// src/types/auth.ts
export type UserRole =
  | 'department employee'
  | 'department head'
  | 'HR Manager'
  | 'HR Employee'
  | 'Payroll Specialist'
  | 'Payroll Manager'
  | 'System Admin'
  | 'Legal & Policy Admin'
  | 'Recruiter'
  | 'Finance Staff'
  | 'Job Candidate'
  | 'HR Admin'

export interface AuthPayload {
  userId: string
  email: string
  role: UserRole

  employeeId?: string
  departmentId?: string
  positionId?: string
  roles?: UserRole[]
  permissions?: string[]

  exp?: number
}
