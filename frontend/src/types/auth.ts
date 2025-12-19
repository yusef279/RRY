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
  firstName?: string  // <-- Add this
  lastName?: string   // <-- Add this
  
  // Keep only one permissions property
  permissions?: string[]

  employeeId?: string
  departmentId?: string
  positionId?: string
  roles?: UserRole[]

  exp?: number
}