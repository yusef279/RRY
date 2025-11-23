import { StructureRequestType } from '../enums/organization-structure.enums';

export class CreateStructureChangeRequestDto {
  /**
   * If not provided, the service will generate a request number.
   */
  requestNumber?: string;

  requestedByEmployeeId: string;
  requestType: StructureRequestType;

  targetDepartmentId?: string;
  targetPositionId?: string;

  /**
   * Free JSON payload describing the structural change.
   * Will be stringified into the `details` string field.
   * Example for NEW_POSITION: { code, title, departmentId, reportsToPositionId }
   */
  details?: Record<string, any>;

  /**
   * Business justification for the request.
   */
  reason?: string;
}
