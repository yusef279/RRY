// src/types/performance.ts


/* ======================================================
   ENUMS (must match backend exactly)
====================================================== */

export enum AppraisalTemplateType {
  ANNUAL = 'ANNUAL',
  SEMI_ANNUAL = 'SEMI_ANNUAL',
  PROBATIONARY = 'PROBATIONARY',
  PROJECT = 'PROJECT',
  AD_HOC = 'AD_HOC',
}

export enum AppraisalCycleStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export enum AppraisalAssignmentStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  PUBLISHED = 'PUBLISHED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
}

export enum AppraisalRecordStatus {
  DRAFT = 'DRAFT',
  MANAGER_SUBMITTED = 'MANAGER_SUBMITTED',
  HR_PUBLISHED = 'HR_PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum AppraisalDisputeStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ADJUSTED = 'ADJUSTED',
  REJECTED = 'REJECTED',
}

export enum AppraisalRatingScaleType {
  THREE_POINT = 'THREE_POINT',
  FIVE_POINT = 'FIVE_POINT',
  TEN_POINT = 'TEN_POINT',
}

/* ======================================================
   SHARED BASIC TYPES
====================================================== */

export type RatingScale = {
  type: AppraisalRatingScaleType;
  min?: number;
  max?: number;
  labels?: Record<number, string>;
};

export type AppraisalCriterion = {
  _id: string;
  name: string;
  description?: string;
  weight?: number;
};

/* ======================================================
   TEMPLATE
====================================================== */

export type AppraisalTemplate = {
  _id: string;
  name: string;
  templateType: AppraisalTemplateType;

  ratingScale?: RatingScale;
  criteria?: AppraisalCriterion[];

  applicableDepartmentIds?: string[];
  applicablePositionIds?: string[];

  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;
};

/* ======================================================
   CYCLE
====================================================== */

export type AppraisalCycle = {
  _id: string;
  name: string;

  startDate?: string;
  endDate?: string;
  closedAt?: string;

  status: AppraisalCycleStatus;

  createdAt?: string;
  updatedAt?: string;
};

/* ======================================================
   ASSIGNMENT (Manager-facing)
====================================================== */

export type AppraisalAssignment = {
  _id: string;

  cycleId: {
    _id: string;
    name: string;
    status?: AppraisalCycleStatus;
  };

  templateId: {
    _id: string;
    name: string;
    templateType?: AppraisalTemplateType;
    ratingScale: { min: number; max: number; step?: number };
     criteria: {
  key: string;
 title: string;
  details?: string;
  weight: number;
 maxScore?: number;
  required?: boolean;
}[];
  instructions?: string; // ← add this

  };

  employeeProfileId: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName?: string;
  };

  managerProfileId: {
    _id: string;
    firstName: string;
    lastName?: string;
    fullName?: string;
  };

  departmentId?: {
    _id: string;
    name: string;
  };

  positionId?: {
    _id: string;
    name: string;
  };

  status: AppraisalAssignmentStatus;

  dueDate?: string;
  submittedAt?: string;
  publishedAt?: string;

  latestAppraisalId?: string;

  createdAt?: string;
  updatedAt?: string;
};

/* ======================================================
   RECORD (Submitted appraisal)
====================================================== */

export type AppraisalRating = {
  criterionId: string;
  ratingValue?: number;
  weightedScore?: number;
  comment?: string;
};

export type AppraisalRecord = {
  _id: string;

  assignmentId?: string;

  cycleId?: {
    _id: string;
    name: string;
  };

  templateId?: {
    _id: string;
    name: string;
    templateType?: AppraisalTemplateType;
  };

  employeeProfileId?: {
    _id: string;
    employeeId?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
  };

  managerProfileId?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
  };

  ratings?: AppraisalRating[];

  totalScore?: number;
  overallRatingLabel?: string;
  overallComment?: string;

  status: AppraisalRecordStatus;

  managerSubmittedAt?: string;
  hrPublishedAt?: string;
  employeeAcknowledgedAt?: string;

  createdAt?: string;
  updatedAt?: string;
};

/* ======================================================
   DISPUTE
====================================================== */

export type EmployeeRef = {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  employeeId?: string;
};

export type AppraisalDispute = {
  _id: string;
  appraisalId: string;
  assignmentId: string;
  cycleId: string;
  
  // Allow both populated object or just string ID
  raisedByEmployeeId: EmployeeRef | string;
  
  reason: string;
  details?: string;
  status: AppraisalDisputeStatus;
  resolutionSummary?: string;
  
  // Allow both populated object or just string ID
  resolvedByEmployeeId?: EmployeeRef | string;
  
  submittedAt?: string;
  resolvedAt?: string;
  
  // Add these for better debugging
  createdAt?: string;
  updatedAt?: string;
};
/* ======================================================
   DASHBOARD / REPORT TYPES
====================================================== */

export type DepartmentProgress = {
  departmentId: string;
  departmentName: string;

  total: number;
  notStarted: number;
  inProgress: number;
  submitted: number;
  published: number;
  acknowledged: number;

  completionRate: number;
};

export type PerformanceDashboardStats = {
  totalCycles: number;
  activeCycles: number;
  totalAssignments: number;
  submittedRecords: number;
  publishedRecords: number;
  openDisputes: number;
  completionRate: number;
};

/* ======================================================
   API PAYLOAD TYPES (optional but recommended)
====================================================== */

export type SubmitAppraisalPayload = {
  assignmentId: string;
  cycleId: string;
  templateId: string;
  employeeProfileId: string;
  managerProfileId: string;
  ratings: AppraisalRating[];
  overallComment?: string;
};

export type PublishRecordPayload = {
  hrPublishedById?: string;
};

export type RaiseDisputePayload = {
  appraisalId: string;
  assignmentId: string;
  cycleId: string;
  raisedByEmployeeId: string;
  reason: string;
  details?: string; // Add this optional field
};
// Add this section at the end of your types/performance.ts file, 
// right after all the type definitions:

/* ======================================================
   HELPER FUNCTIONS for handling employee references
====================================================== */

// Helper function to get employee name safely
export const getEmployeeName = (employeeRef: EmployeeRef | string | undefined): string => {
  if (!employeeRef) return 'Unknown Employee';
  
  if (typeof employeeRef === 'string') {
    // It's just an ObjectId string
    return `Employee (${employeeRef.substring(0, 8)}...)`;
  }
  
  // It's a populated object
  const name = `${employeeRef.firstName || ''} ${employeeRef.lastName || ''}`.trim();
  return name || employeeRef.email || `Employee (${employeeRef._id.substring(0, 8)}...)`;
};

// Helper function to get employee email safely
export const getEmployeeEmail = (employeeRef: EmployeeRef | string | undefined): string | undefined => {
  if (!employeeRef || typeof employeeRef === 'string') {
    return undefined;
  }
  return employeeRef.email;
};

// Type guard to check if employee is populated
export const isEmployeePopulated = (employeeRef: EmployeeRef | string | undefined): employeeRef is EmployeeRef => {
  return !!employeeRef && 
         typeof employeeRef === 'object' && 
         '_id' in employeeRef && 
         'firstName' in employeeRef;
};

// Helper function to format dates
export const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Helper function to format date with time
export const formatDateTime = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
type BaseDepartment = {
  _id: string;
  name: string;
  code: string;
  employeeCount?: number;
};

type BaseTemplate = {
  _id: string;
  name: string;
  templateType: AppraisalTemplateType;
  description?: string;
  applicableDepartmentIds?: string[];
  applicablePositionIds?: string[];
};

// Update the existing types
type Template = BaseTemplate;

type Department = BaseDepartment & {
  isApplicable?: boolean;
};

type DepartmentWithApplicability = Department;

