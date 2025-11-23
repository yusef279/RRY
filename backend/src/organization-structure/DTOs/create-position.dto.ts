export class CreatePositionDto {
  code: string;
  title: string;
  description?: string;

  /**
   * Required – every position must belong to a department.
   * BR 10: Position must have Dept ID. :contentReference[oaicite:2]{index=2}
   */
  departmentId: string;

  /**
   * Optional explicit manager / reports-to.
   * If omitted, the schema hook will default to department head. :contentReference[oaicite:3]{index=3}
   */
  reportsToPositionId?: string;

  /**
   * Optional: employee profile ID of the admin who is creating this position.
   * Used only for audit logging.
   */
  performedByEmployeeId?: string;
}
