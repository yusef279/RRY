export class UpdatePositionDto {
  title?: string;
  description?: string;
  departmentId?: string;
  reportsToPositionId?: string;
  isActive?: boolean;

  /**
   * Optional: employee profile ID of the admin who is updating this position.
   * Used only for audit logging.
   */
  performedByEmployeeId?: string;
}
