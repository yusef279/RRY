export interface Department {
  _id?: string
  name: string
  code: string
  status?: 'ACTIVE' | 'INACTIVE'
}

export interface Position {
  _id?: string
  name: string
  title: string
  code: string
  departmentId: string
  departmentName?: string
  description?: string; // ← new

  payGrade?: string
  status?: 'ACTIVE' | 'INACTIVE'
}
