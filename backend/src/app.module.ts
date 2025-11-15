import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrgStructureModule } from './org-structure/org-structure.module';

@Module({
  imports: [OrgStructureModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
