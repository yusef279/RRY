export type ChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ChangeRequest {
  _id: string
  employeeId?: string
  field: string
  oldValue?: string
  newValue: string
  justification: string
  status: ChangeRequestStatus
  hrComment?: string
  createdAt?: string
  updatedAt?: string
}
