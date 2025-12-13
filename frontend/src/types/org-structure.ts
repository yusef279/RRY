export interface Department {
  _id?: string
  name: string
  code: string
  status?: 'ACTIVE' | 'INACTIVE'
}

export interface Position {
  _id?: string
  name: string
  code: string
  departmentId: string
  departmentName?: string
  payGrade?: string
  status?: 'ACTIVE' | 'INACTIVE'
}
