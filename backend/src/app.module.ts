import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeModule } from './employee/employee.module';
import { PerformanceModule } from './performance/performance.module';
import { OrgStructureModule } from './org-structure/org-structure.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/hr-system',
    ),
    EmployeeModule,
    OrgStructureModule,
    PerformanceModule,
  ],
})
export class AppModule {}
