'use client';
import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { AppraisalDisputeStatus } from '@/types/performance';

type Dispute = {
  _id: string;
  status: AppraisalDisputeStatus;
  reason: string;
  resolutionSummary?: string;
  raisedByEmployeeId: { firstName: string; lastName: string };
  appraisalId: { _id: string };
};

const statusBadge = (s: AppraisalDisputeStatus) => {
  switch (s) {
    case AppraisalDisputeStatus.OPEN:
      return 'bg-red-100 text-red-800';
    case AppraisalDisputeStatus.UNDER_REVIEW:
      return 'bg-yellow-100 text-yellow-800';
    case AppraisalDisputeStatus.ADJUSTED:
    case AppraisalDisputeStatus.REJECTED:
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function DisputesPage() {
  const [rows, setRows] = useState<Dispute[]>([]);
  const [sel, setSel] = useState<Dispute | null>(null);
  const [res, setRes] = useState('');
  const [dec, setDec] = useState<'APPROVED' | 'REJECTED'>('APPROVED');

  const load = () =>
    api
      .get('/performance/disputes')
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .catch((e) => toast.error(e.response?.data?.message || 'Load failed'));

  useEffect(() => {
    load();
  }, []);

  const resolve = async () => {
    if (!res.trim()) {
      toast.error('Resolution required');
      return;
    }
    await api.patch(`/performance/disputes/${sel!._id}/resolve`, {
      status: dec,
      resolutionSummary: res,
      resolvedBy: 'HR',
    });
    toast.success('Resolved');
    setSel(null);
    load();
  };

  return (
    <AppShell title="Appraisal disputes" allowedRoles={['HR Admin', 'System Admin']}>
      <Card>
        <CardHeader>
          <CardTitle>Disputes</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No disputes found
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((d) => (
                    <TableRow key={d._id}>
                      <TableCell>
                        {d.raisedByEmployeeId.firstName} {d.raisedByEmployeeId.lastName}
                      </TableCell>
                      <TableCell className="max-w-lg truncate">{d.reason}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${statusBadge(d.status)}`}>{d.status}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {d.status !== AppraisalDisputeStatus.ADJUSTED && (
                          <Button size="sm" onClick={() => setSel(d)}>
                            Review
                          </Button>
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

      {sel && (
        <Dialog open onOpenChange={() => setSel(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve dispute</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Employee:</span> {sel.raisedByEmployeeId.firstName}{' '}
                {sel.raisedByEmployeeId.lastName}
              </p>
              <p>
                <span className="font-medium">Reason:</span> {sel.reason}
              </p>
            </div>
            <label>Decision</label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={dec === 'APPROVED' ? 'default' : 'outline'}
                onClick={() => setDec('APPROVED')}
              >
                <Check className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant={dec === 'REJECTED' ? 'default' : 'outline'}
                onClick={() => setDec('REJECTED')}
              >
                <X className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
            <label>Resolution summary</label>
            <Textarea
              rows={3}
              value={res}
              onChange={(e) => setRes(e.target.value)}
              placeholder="Explain the outcome to employee"
            />
            <DialogFooter>
              <Button onClick={resolve}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
  );
}