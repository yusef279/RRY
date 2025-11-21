import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Employee, EmployeeSchema } from './schemas/employee.schema';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { ProfileChangeRequest, ProfileChangeRequestSchema,} from './schemas/profile-change-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: ProfileChangeRequest.name, schema: ProfileChangeRequestSchema },
    ]),
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService],
  exports: [EmployeeService, MongooseModule],
})
export class EmployeeModule {}
