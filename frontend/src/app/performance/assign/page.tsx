'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { AppraisalAssignmentStatus } from '@/types/performance';

type Cycle   = { _id: string; name: string };
type Template = { _id: string; name: string };
type Department = { _id: string; name: string };
type Position  = { _id: string; name: string };
type Employee  = {
  _id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  primaryDepartmentId?: { _id: string; name: string };
  primaryPositionId?: { _id: string; name: string };
  managerProfileId?: { _id: string };
};

export default function AssignAppraisalsPage() {
  const [cycles, setCycles]       = useState<Cycle[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [depts, setDepts]         = useState<Department[]>([]);
  const [pos, setPos]             = useState<Position[]>([]);

  /* selections */
  const [cycleId, setCycleId]     = useState('');
  const [templateId, setTemplateId] = useState('');
  const [deptIds, setDeptIds]     = useState<string[]>([]);
  const [posIds, setPosIds]       = useState<string[]>([]);
  const [preview, setPreview]     = useState<Employee[]>([]);
  const [assigning, setAssigning] = useState(false);

  /* initial load */
  useEffect(() => {
    Promise.all([
      api.get('/performance/cycles'),
      api.get('/performance/templates'),
      api.get('/organization-structure/departments'),
      api.get('/organization-structure/positions'),
    ])
      .then(([c, t, d, p]) => {
        setCycles(Array.isArray(c.data) ? c.data : []);
        setTemplates(Array.isArray(t.data) ? t.data : []);
        setDepts(Array.isArray(d.data) ? d.data : []);
        setPos(Array.isArray(p.data) ? p.data : []);
      })
      .catch(() => toast.error('Load failed'));
  }, []);

  /* ----------  PREVIEW EMPLOYEES  ---------- */
  const buildPreview = async () => {
    if (!cycleId || !templateId) return;
    const params = new URLSearchParams();
    deptIds.forEach((id) => params.append('departmentIds', id));
    posIds.forEach((id) => params.append('positionIds', id));
    const res = await api.get('/employee-profile/admin/search', { params });
    setPreview(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => {
    buildPreview();
  }, [cycleId, templateId, deptIds, posIds]);

  /* ----------  BULK ASSIGN  ---------- */
  const assign = async () => {
    if (!cycleId || !templateId || preview.length === 0) {
      toast.error('Please select cycle, template and at least one employee');
      return;
    }
    setAssigning(true);

    /* 1. build raw objects */
    const raw = preview.map((emp) => ({
      cycleId,
      templateId,
      employeeProfileId: emp._id,
      managerProfileId: emp.managerProfileId?._id,
      departmentId: emp.primaryDepartmentId?._id,
      positionId: emp.primaryPositionId?._id,
      status: AppraisalAssignmentStatus.NOT_STARTED,
    }));

    /* 2. strip undefined / empty strings */
    const cleaned = raw.map((r) => {
      const out: any = {
        cycleId: r.cycleId,
        templateId: r.templateId,
        employeeProfileId: r.employeeProfileId,
        status: r.status,
      };
      if (r.managerProfileId && r.managerProfileId !== '') out.managerProfileId = r.managerProfileId;
      if (r.departmentId && r.departmentId !== '') out.departmentId = r.departmentId;
      if (r.positionId && r.positionId !== '') out.positionId = r.positionId;
      return out;
    });

    try {
      await api.post('/performance/assignments/bulk', { assignments: cleaned });
      toast.success(`${cleaned.length} assignments created`);
      /* reset form */
      setDeptIds([]);
      setPosIds([]);
      setPreview([]);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  /* ----------  RENDER  ---------- */
  return (
    <AppShell title="Assign appraisals" allowedRoles={['HR Admin', 'System Admin']}>
      <Card>
        <CardHeader>
          <CardTitle>Bulk assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cycle & Template */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Appraisal cycle *</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={cycleId}
                onChange={(e) => setCycleId(e.target.value)}
              >
                <option value="">Select cycle…</option>
                {cycles.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Template *</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">Select template…</option>
                {templates.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Departments & Positions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Departments (leave empty = all)</Label>
              <ScrollArea className="h-40 border rounded-md p-2">
                {depts.map((d) => (
                  <label key={d._id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={deptIds.includes(d._id)}
                      onChange={() =>
                        setDeptIds((prev) =>
                          prev.includes(d._id)
                            ? prev.filter((i) => i !== d._id)
                            : [...prev, d._id]
                        )
                      }
                      className="h-4 w-4 rounded"
                    />
                    {d.name}
                  </label>
                ))}
              </ScrollArea>
            </div>

            <div>
              <Label>Positions (leave empty = all)</Label>
              <ScrollArea className="h-40 border rounded-md p-2">
                {pos.map((p) => (
                  <label key={p._id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={posIds.includes(p._id)}
                      onChange={() =>
                        setPosIds((prev) =>
                          prev.includes(p._id)
                            ? prev.filter((i) => i !== p._id)
                            : [...prev, p._id]
                        )
                      }
                      className="h-4 w-4 rounded"
                    />
                    {p.name}
                  </label>
                ))}
              </ScrollArea>
            </div>
          </div>

          {/* Preview */}
          <div>
            <Label>Preview ({preview.length} employees)</Label>
            <ScrollArea className="h-64 border rounded-md p-2">
              {preview.length === 0 ? (
                <p className="text-sm text-muted-foreground">No employees match the selected filters.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Position</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((emp) => (
                      <TableRow key={emp._id}>
                        <TableCell>
                          {emp.firstName} {emp.lastName}
                        </TableCell>
                        <TableCell>{emp.employeeNumber}</TableCell>
                        <TableCell>{emp.primaryDepartmentId?.name ?? '—'}</TableCell>
                        <TableCell>{emp.primaryPositionId?.name ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </div>

          {/* Assign button */}
          <div className="flex justify-end">
            <Button onClick={assign} disabled={assigning || preview.length === 0}>
              {assigning ? 'Creating…' : `Create ${preview.length} assignments`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}