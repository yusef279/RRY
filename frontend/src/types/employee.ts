import { UserRole } from './auth'

export interface EmployeeProfile {
  _id?: string
  employeeNumber?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  address?: string
  dateOfBirth?: string
  maritalStatus?: string
  nationalId?: string
  department?: DepartmentRef
  position?: PositionRef
  payGrade?: string
  status?: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED'
  dateOfHire?: string
  bio?: string
  avatarUrl?: string
  roles?: UserRole[]
  appraisalHistory?: Appraisal[]
}

export interface DepartmentRef {
  _id: string
  name: string
}

export interface PositionRef {
  _id: string
  name: string
  department?: DepartmentRef
}

export interface Appraisal {
  date: string
  score: string
  notes?: string
}
