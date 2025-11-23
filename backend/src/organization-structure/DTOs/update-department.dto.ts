export class UpdateDepartmentDto {
  name?: string;
  description?: string;
  isActive?: boolean;

  /**
   * Optional: employee profile ID of the admin who is updating this department.
   * Used only for audit logging.
   */
  performedByEmployeeId?: string;
}
