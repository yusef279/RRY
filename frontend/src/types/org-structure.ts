export interface Department {
  _id?: string
  name: string
  code: string
  status?: 'ACTIVE' | 'INACTIVE'
  employeeCount?: number; // Add this line
    description?: string; // Add this line

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
