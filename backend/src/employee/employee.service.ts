import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { Model } from 'mongoose';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectModel(Employee.name)
    private employeeModel: Model<EmployeeDocument>,
  ) {}

  create(dto: CreateEmployeeDto) {
    return this.employeeModel.create({
      ...dto,
      hireDate: new Date(dto.hireDate),
    });
  }

  findAll() {
    return this.employeeModel.find().exec();
  }

  async findOne(id: string) {
    const emp = await this.employeeModel.findById(id).exec();
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  update(id: string, dto: UpdateEmployeeDto) {
    return this.employeeModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
  }

  async findByEmail(email: string) {
    const emp = await this.employeeModel.findOne({ email }).exec();
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }
}
