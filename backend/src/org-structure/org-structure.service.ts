import { Injectable } from '@nestjs/common';

@Injectable()
export class OrgStructureService {
  getOrgChart() {
    throw new Error('Method not implemented.');
  }

  createDept(data: any) {
    return { ok: true, msg: 'dummy dept created', input: data };
  }

  createPos(data: any) {
    return { ok: true, msg: 'dummy position created', input: data };
  }

  updateReportingLine(posId: string, bossId: string) {
    return { ok: true, msg: 'dummy reporting line updated', posId, bossId };
  }

  deactivatePosition(id: string) {
    return { ok: true, msg: 'dummy deactivated pos', id };
  }

  renameDept(id: string, newName: string) {
    return { ok: true, msg: 'dummy dept renamed'};
 } 
}