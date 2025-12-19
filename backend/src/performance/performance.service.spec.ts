import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceService } from './performance.service';
import { getModelToken } from '@nestjs/mongoose';
import { AppraisalTemplate } from './models/appraisal-template.schema';
import { AppraisalCycle } from './models/appraisal-cycle.schema';
import { AppraisalAssignment } from './models/appraisal-assignment.schema';
import { AppraisalRecord } from './models/appraisal-record.schema';
import { AppraisalDispute } from './models/appraisal-dispute.schema';
import { EmployeeProfile } from '../employee-profile/models/employee-profile.schema';
import { Department } from '../organization-structure/models/department.schema';
import { Position } from '../organization-structure/models/position.schema';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AppraisalAssignmentStatus } from './enums/performance.enums';

// --- MOCK FACTORY ---
// We create a base MockModel class. 
// For each injection, we can provide this class (or a subclass if we needed specific static behavior, 
// but jest.spyOn handles that well on the shared class).
class MockModel {
  constructor(public data: any) { }
  save = jest.fn().mockResolvedValue(this.data);

  static find = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
  static findOne = jest.fn().mockResolvedValue(null);
  static findById = jest.fn().mockResolvedValue(null);
  static countDocuments = jest.fn().mockResolvedValue(0);
  static insertMany = jest.fn().mockResolvedValue([]);
  static findByIdAndUpdate = jest.fn().mockResolvedValue(null);
}

describe('PerformanceService', () => {
  let service: PerformanceService;

  // We'll reset these spies before each test
  let templateModel: typeof MockModel;
  let cycleModel: typeof MockModel;
  let assignmentModel: typeof MockModel;
  let recordModel: typeof MockModel;
  let disputeModel: typeof MockModel;
  let employeeModel: typeof MockModel;
  let departmentModel: typeof MockModel;
  let positionModel: typeof MockModel;

  beforeEach(async () => {
    // Clear all mocks in the MockModel class
    jest.clearAllMocks();

    // We need separate "classes" or just reuse the same one?
    // If we reuse the same one, spying on 'findOne' affects all.
    // So let's create unique classes for each token.
    const createMock = () => {
      class DynamicMockModel extends MockModel { }
      return DynamicMockModel;
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceService,
        { provide: getModelToken(AppraisalTemplate.name), useValue: createMock() },
        { provide: getModelToken(AppraisalCycle.name), useValue: createMock() },
        { provide: getModelToken(AppraisalAssignment.name), useValue: createMock() },
        { provide: getModelToken(AppraisalRecord.name), useValue: createMock() },
        { provide: getModelToken(AppraisalDispute.name), useValue: createMock() },
        { provide: getModelToken(EmployeeProfile.name), useValue: createMock() },
        { provide: getModelToken(Department.name), useValue: createMock() },
        { provide: getModelToken(Position.name), useValue: createMock() },
      ],
    }).compile();

    service = module.get<PerformanceService>(PerformanceService);
    templateModel = module.get(getModelToken(AppraisalTemplate.name));
    cycleModel = module.get(getModelToken(AppraisalCycle.name));
    assignmentModel = module.get(getModelToken(AppraisalAssignment.name));
    recordModel = module.get(getModelToken(AppraisalRecord.name));
    disputeModel = module.get(getModelToken(AppraisalDispute.name));
    employeeModel = module.get(getModelToken(EmployeeProfile.name));
    departmentModel = module.get(getModelToken(Department.name));
    positionModel = module.get(getModelToken(Position.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /* -------------------------------------------------------------------------- */
  /*                             Template Tests                                 */
  /* -------------------------------------------------------------------------- */
  describe('createTemplate', () => {
    it('should create a template successfully', async () => {
      const dto = {
        name: 'Annual Review 2025',
        applicableDepartmentIds: ['dept1'],
        applicablePositionIds: ['pos1'],
      };

      // Setup spies
      jest.spyOn(templateModel, 'findOne').mockResolvedValue(null);
      jest.spyOn(departmentModel, 'findById').mockResolvedValue({ _id: 'dept1' });
      jest.spyOn(positionModel, 'findById').mockResolvedValue({ _id: 'pos1' });

      const result = await service.createTemplate(dto as any);

      // Verify save was called (we check the result which comes from save mock)
      expect(result).toEqual(expect.objectContaining({ name: 'Annual Review 2025' }));
      expect(departmentModel.findById).toHaveBeenCalledWith('dept1');
    });

    it('should fail if department does not exist', async () => {
      const dto = { name: 'Test', applicableDepartmentIds: ['bad_dept'], applicablePositionIds: ['pos1'] };
      jest.spyOn(departmentModel, 'findById').mockResolvedValue(null); // Missing dept
      await expect(service.createTemplate(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should fail if template name exists', async () => {
      const dto = { name: 'Duplicate', applicableDepartmentIds: ['d1'], applicablePositionIds: ['p1'] };
      jest.spyOn(templateModel, 'findOne').mockResolvedValue({ _id: 'existing' });
      jest.spyOn(departmentModel, 'findById').mockResolvedValue({ _id: 'd1' });
      jest.spyOn(positionModel, 'findById').mockResolvedValue({ _id: 'p1' });
      await expect(service.createTemplate(dto as any)).rejects.toThrow(ConflictException);
    });
  });

  /* -------------------------------------------------------------------------- */
  /*                               Cycle Tests                                  */
  /* -------------------------------------------------------------------------- */
  describe('createCycle', () => {
    it('should fail if startDate >= endDate', async () => {
      const dto = {
        name: 'Bad Dates',
        startDate: '2025-02-01',
        endDate: '2025-01-01',
        templateAssignments: []
      };
      await expect(service.createCycle(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should fail if overlapping cycle exists for department', async () => {
      const dto = {
        name: 'Overlap',
        startDate: '2025-01-01',
        endDate: '2025-03-01',
        templateAssignments: [
          { templateId: 't1', departmentIds: ['d1'] }
        ]
      };
      jest.spyOn(templateModel, 'findById').mockResolvedValue({});
      jest.spyOn(departmentModel, 'findById').mockResolvedValue({});
      jest.spyOn(cycleModel, 'findOne').mockResolvedValue({ _id: 'existing_cycle' });

      await expect(service.createCycle(dto as any)).rejects.toThrow(ConflictException);
    });
  });

  /* -------------------------------------------------------------------------- */
  /*                            Assignment Tests                                */
  /* -------------------------------------------------------------------------- */
  describe('bulkAssign', () => {
    it('should fail if department head cannot be found (no supervisor, no head)', async () => {
      const dto = {
        assignments: [{
          cycleId: 'c1',
          templateId: 't1',
          employeeProfileId: 'emp1',
          departmentId: 'dept1',
        }]
      };

      jest.spyOn(cycleModel, 'findById').mockResolvedValue({});
      jest.spyOn(employeeModel, 'findById').mockResolvedValue({ _id: 'emp1', firstName: 'John' });
      jest.spyOn(departmentModel, 'findById').mockResolvedValue({ _id: 'dept1' });
      jest.spyOn(templateModel, 'findById').mockResolvedValue({});
      jest.spyOn(employeeModel, 'findOne').mockResolvedValue(null); // No manager found

      await expect(service.bulkAssign(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should auto-map manager from department head and create assignment', async () => {
      const dto = {
        assignments: [{
          cycleId: 'c1',
          templateId: 't1',
          employeeProfileId: 'emp1',
          departmentId: 'dept1',
        }]
      };

      jest.spyOn(cycleModel, 'findById').mockResolvedValue({});
      jest.spyOn(employeeModel, 'findById').mockResolvedValue({ _id: 'emp1', firstName: 'John' });
      jest.spyOn(departmentModel, 'findById').mockResolvedValue({ _id: 'dept1', headPositionId: 'pos_head' });
      jest.spyOn(templateModel, 'findById').mockResolvedValue({});

      // Mock finding the department head
      const mockManager = { _id: 'mgr1', firstName: 'Boss' };
      jest.spyOn(employeeModel, 'findOne').mockResolvedValue(mockManager);

      jest.spyOn(assignmentModel, 'findOne').mockResolvedValue(null); // No duplicate
      jest.spyOn(assignmentModel, 'insertMany').mockResolvedValue([{ _id: 'ass1', managerProfileId: 'mgr1' }]);

      await service.bulkAssign(dto as any);

      expect(assignmentModel.insertMany).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          employeeProfileId: 'emp1',
          managerProfileId: 'mgr1' // Should be auto-mapped
        })
      ]));
    });
  });

  /* -------------------------------------------------------------------------- */
  /*                              Grading Tests                                 */
  /* -------------------------------------------------------------------------- */
  describe('submitRecord', () => {
    it('should fail if rating is outside scale', async () => {
      const dto = {
        assignmentId: 'a1',
        ratings: [{ ratingValue: 6 }] // Scale is 1-5
      };

      jest.spyOn(assignmentModel, 'findById').mockResolvedValue({
        status: AppraisalAssignmentStatus.IN_PROGRESS,
        templateId: 't1',
        save: jest.fn()
      });
      jest.spyOn(templateModel, 'findById').mockResolvedValue({
        ratingScale: { min: 1, max: 5 }
      });

      await expect(service.submitRecord(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should calculate total score correctly and save record', async () => {
      const dto = {
        assignmentId: 'a1',
        ratings: [
          { ratingValue: 4 },
          { ratingValue: 5 }
        ]
      };

      const mockAssignment = {
        status: AppraisalAssignmentStatus.IN_PROGRESS,
        templateId: 't1',
        save: jest.fn()
      };
      jest.spyOn(assignmentModel, 'findById').mockResolvedValue(mockAssignment);
      jest.spyOn(templateModel, 'findById').mockResolvedValue({
        ratingScale: { min: 1, max: 5 }
      });

      const result = await service.submitRecord(dto as any);

      // The service does `new this.recordModel({...})`. Our MockModel's constructor takes the data 
      // and its save() returns it.
      // We verify the data passed to the constructor (which ends up in result via save)
      expect(result).toEqual(expect.objectContaining({
        totalScore: 9
      }));
      expect(mockAssignment.status).toBe(AppraisalAssignmentStatus.SUBMITTED);
      expect(mockAssignment.save).toHaveBeenCalled();
    });
  });

});
