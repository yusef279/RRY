import { UserRole } from './auth'

export interface AddressRef {
  city?: string
  streetAddress?: string
  country?: string
}

export interface DepartmentRef {
  _id: string
  name: string
  code?: string
}

export interface PositionRef {
  _id: string
  name: string
  code?: string
  title?: string
  department?: DepartmentRef
}

export interface EmployeeProfile {
  _id?: string
  employeeNumber?: string
  firstName?: string
  middleName?: string
  lastName?: string
  fullName?: string
  workEmail?: string
  personalEmail?: string
  mobilePhone?: string
  homePhone?: string
  address?: AddressRef
  dateOfBirth?: string
  maritalStatus?: string
  nationalId?: string
  primaryDepartmentId?: string | DepartmentRef
  primaryPositionId?: string | PositionRef
  supervisorPositionId?: string
  payGradeId?: string
  status?:
    | 'ACTIVE'
    | 'INACTIVE'
    | 'ON_LEAVE'
    | 'SUSPENDED'
    | 'RETIRED'
    | 'PROBATION'
    | 'TERMINATED'
  dateOfHire?: string
  biography?: string
  profilePictureUrl?: string

  // For convenience in UI (when populated):
  roles?: UserRole[]
  department?: DepartmentRef
  position?: PositionRef
}
