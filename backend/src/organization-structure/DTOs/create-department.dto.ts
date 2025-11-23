export class CreateDepartmentDto {
  code: string;
  name: string;
  description?: string;
  performedByEmployeeId?: string;
}
