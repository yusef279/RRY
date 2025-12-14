'use client';
import { useEffect, useState } from 'react';
import { Plus, Play, X, Send } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { AppraisalCycleStatus, AppraisalTemplateType } from '@/types/performance';

type Cycle = {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AppraisalCycleStatus;
  cycleType: AppraisalTemplateType;
};

export default function CyclesPage() {
  const [rows, setRows] = useState<Cycle[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    cycleType: AppraisalTemplateType.ANNUAL, // ← NEW
  });

  const load = () =>
    api
      .get('/performance/cycles')
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('Load failed'));

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    try {
      await api.post('/performance/cycles', {
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        cycleType: form.cycleType, // ← NEW
        templateAssignments: [],
      });
      toast.success('Created');
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Create failed');
    }
  };

  const activate = async (id: string) => {
    await api.patch(`/performance/cycles/${id}/activate`);
    toast.success('Activated');
    load();
  };

  const close = async (id: string) => {
    await api.patch(`/performance/cycles/${id}/close`);
    toast.success('Closed');
    load();
  };

  const remind = async (id: string) => {
    await api.post(`/performance/cycles/${id}/reminders`);
    toast.success('Reminders queued');
  };

  const statusBadge = (s: AppraisalCycleStatus) => {
    switch (s) {
      case AppraisalCycleStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case AppraisalCycleStatus.CLOSED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-amber-100 text-amber-800';
    }
  };

  return (
    <AppShell title="Appraisal cycles" allowedRoles={['HR Admin', 'HR Manager','HR Employee','System Admin']}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cycles</CardTitle>
          <Button
            onClick={() => {
              setForm({ name: '', startDate: '', endDate: '', cycleType: AppraisalTemplateType.ANNUAL });
              setOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No cycles found
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((c) => (
                    <TableRow key={c._id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.cycleType.replace('_', ' ')}</TableCell>
                      <TableCell>{new Date(c.startDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(c.endDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${statusBadge(c.status)}`}>{c.status}</span>
                      </TableCell>
                      <TableCell className="text-right flex gap-2 justify-end">
                        {c.status === AppraisalCycleStatus.PLANNED && (
                          <Button size="sm" onClick={() => activate(c._id)}>
                            <Play className="w-4 h-4 mr-1" />
                            Activate
                          </Button>
                        )}
                        {c.status === AppraisalCycleStatus.ACTIVE && (
                          <>
                            <Button size="sm" onClick={() => remind(c._id)}>
                              <Send className="w-4 h-4 mr-1" />
                              Remind
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => close(c._id)}>
                              <X className="w-4 h-4 mr-1" />
                              Close
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New cycle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Cycle name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Label>
                Start date
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </Label>
              <Label>
                End date
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </Label>
            </div>
            <Label>Cycle type</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.cycleType}
              onChange={(e) => setForm({ ...form, cycleType: e.target.value as AppraisalTemplateType })}
            >
              {Object.values(AppraisalTemplateType).map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button onClick={create}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}