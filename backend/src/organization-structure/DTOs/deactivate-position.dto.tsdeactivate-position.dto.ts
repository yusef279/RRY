export class DeactivatePositionDto {
  /**
   * Date from which the position is considered closed (delimited).
   */
  closedAt: Date;

  /**
   * Optional reason for deactivation (e.g., re-org, redundancy).
   */
  reason?: string;

  /**
   * Optional notes.
   */
  notes?: string;

  /**
   * Optional: employee profile ID of the admin who is deactivating this position.
   * Used only for audit logging.
   */
  performedByEmployeeId?: string;
}
