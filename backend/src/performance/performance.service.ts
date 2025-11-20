import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TemplateDocument } from './schema/template.schema';
import { AppraisalCycleDocument } from './schema/appraisalCycle.schema';
import { EvaluationDocument } from './schema/evaluation.schema';
import { DisputeDocument } from './schema/dispute.schema';
import { CreateTemplateDto } from './dto/create-template.dto';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Injectable()
export class PerformanceService {
  constructor(
    @InjectModel('Template') private templateModel: Model<TemplateDocument>,
    @InjectModel('AppraisalCycle') private cycleModel: Model<AppraisalCycleDocument>,
    @InjectModel('Evaluation') private evalModel: Model<EvaluationDocument>,
    @InjectModel('Dispute') private disputeModel: Model<DisputeDocument>,
    @InjectModel('Employee') private employeeModel: Model<any>,
  ) {}

  // ============ TEMPLATES ============
  async createTemplate(dto: CreateTemplateDto) {
    const t = new this.templateModel(dto);
    return t.save();
  }

  async listTemplates() {
    return this.templateModel.find().lean();
  }

  async getTemplate(id: string) {
    const t = await this.templateModel.findById(id).lean();
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  // ============ CYCLES ============
  async createCycle(dto: CreateCycleDto) {
    const tpl = await this.templateModel.findById(dto.templateId);
    if (!tpl) throw new NotFoundException('Template not found');
    const cycle = new this.cycleModel({
      name: dto.name,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      templateId: dto.templateId,
      assignedEmployees: dto.assignedEmployees || [],
      status: 'Upcoming',
    });
    return cycle.save();
  }

  async listCycles() {
    return this.cycleModel.find().populate('templateId').lean();
  }

  async assignEmployees(cycleId: string, employeeIds: string[]) {
    const cycle = await this.cycleModel.findById(cycleId);
    if (!cycle) throw new NotFoundException('Cycle not found');
    
    const validIds = await Promise.all(
      employeeIds.map(async (id) => {
        const e = await this.employeeModel.findById(id).select('_id');
        if (!e) throw new NotFoundException(`Employee ${id} not found`);
        return e._id;
      }),
    );
    
    cycle.assignedEmployees = Array.from(
      new Set([...cycle.assignedEmployees.map(String), ...validIds.map(String)])
    ).map((s) => new Types.ObjectId(s));
    
    return cycle.save();
  }

  async updateCycleStatus(id: string, status: string) {
    const validStatuses = ['Upcoming', 'Active', 'Closed', 'Archived'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Status must be one of: ${validStatuses.join(', ')}`);
    }
    
    const cycle = await this.cycleModel.findById(id);
    if (!cycle) throw new NotFoundException('Cycle not found');
    
    cycle.status = status;
    return cycle.save();
  }

  // ============ EVALUATIONS ============
  async createEvaluation(dto: CreateEvaluationDto) {
    const cycle = await this.cycleModel.findById(dto.cycleId);
    if (!cycle) throw new NotFoundException('Cycle not found');
    
    const emp = await this.employeeModel.findById(dto.employeeId);
    if (!emp) throw new NotFoundException('Employee not found');
    
    const mgr = await this.employeeModel.findById(dto.managerId);
    if (!mgr) throw new NotFoundException('Manager not found');

    const ev = new this.evalModel({
      cycleId: dto.cycleId,
      employeeId: dto.employeeId,
      managerId: dto.managerId,
      scores: dto.scores || {},
      comments: dto.comments || '',
      status: 'Draft',
      acknowledged: false,
    });
    return ev.save();
  }

  async submitEvaluation(id: string) {
    const e = await this.evalModel.findById(id);
    if (!e) throw new NotFoundException('Evaluation not found');
    if (e.status !== 'Draft') {
      throw new BadRequestException('Only Draft evaluations can be submitted');
    }
    e.status = 'Submitted';
    return e.save();
  }

  async publishEvaluation(id: string) {
    const e = await this.evalModel.findById(id);
    if (!e) throw new NotFoundException('Evaluation not found');
    e.status = 'Published';
    return e.save();
  }

  async acknowledgeEvaluation(id: string, employeeId: string) {
    const e = await this.evalModel.findById(id);
    if (!e) throw new NotFoundException('Evaluation not found');
    if (String(e.employeeId) !== String(employeeId)) {
      throw new BadRequestException('Only the employee can acknowledge their evaluation');
    }
    e.acknowledged = true;
    return e.save();
  }

  async listEvaluationsForEmployee(employeeId: string) {
    return this.evalModel
      .find({ employeeId })
      .populate('cycleId')
      .populate('managerId')
      .lean();
  }

  async getEvaluation(id: string) {
    const e = await this.evalModel
      .findById(id)
      .populate('cycleId')
      .populate('employeeId')
      .populate('managerId')
      .lean();
    if (!e) throw new NotFoundException('Evaluation not found');
    return e;
  }

  // ============ DISPUTES ============
  async createDispute(dto: CreateDisputeDto) {
    const ev = await this.evalModel.findById(dto.evaluationId);
    if (!ev) throw new NotFoundException('Evaluation not found');
    if (ev.status !== 'Published') {
      throw new BadRequestException('Can only dispute published evaluations');
    }
    
    const d = new this.disputeModel({
      evaluationId: dto.evaluationId,
      reason: dto.reason,
      employeeComments: dto.employeeComments || '',
      status: 'Pending',
      hrDecision: '',
    });
    return d.save();
  }

  async resolveDispute(id: string, dto: ResolveDisputeDto) {
    const d = await this.disputeModel.findById(id);
    if (!d) throw new NotFoundException('Dispute not found');
    
    d.status = dto.status;
    d.hrDecision = dto.hrDecision || '';
    await d.save();
    return d;
  }

  async listDisputes() {
    return this.disputeModel.find().populate('evaluationId').lean();
  }
}