export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'SYS_ADMIN' | 'HR_MANAGER' | 'HR_EMPLOYEE'

export interface AuthPayload {
  sub?: string
  email?: string
  name?: string
  role?: UserRole
  roles?: UserRole[]
  exp?: number
}
