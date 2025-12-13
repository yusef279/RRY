'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { AppraisalAssignmentStatus, AppraisalRecordStatus } from '@/types/performance';

type Assignment = {
  _id: string;
  status: AppraisalAssignmentStatus;
  dueDate?: string;
  cycleId: { name: string };
  templateId: { name: string };
  managerProfileId: { firstName: string; lastName: string };
};

type Record = {
  _id: string;
  totalScore: number;
  overallRatingLabel?: string;
  status: AppraisalRecordStatus;
  cycleId: { name: string };
  templateId: { name: string };
};

const statusColour = (s: AppraisalAssignmentStatus | AppraisalRecordStatus) => {
  switch (s) {
    case AppraisalRecordStatus.HR_PUBLISHED:
    case AppraisalAssignmentStatus.PUBLISHED:
    case AppraisalAssignmentStatus.ACKNOWLEDGED:
      return 'bg-green-100 text-green-800';
    case AppraisalRecordStatus.MANAGER_SUBMITTED:
    case AppraisalAssignmentStatus.SUBMITTED:
      return 'bg-blue-100 text-blue-800';
    case AppraisalAssignmentStatus.NOT_STARTED:
    case AppraisalAssignmentStatus.IN_PROGRESS:
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function PerformancePage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const me = getCurrentUser();
    if (!me?.employeeId) { router.push('/login'); return; }
    Promise.all([
      api.get(`/performance/assignments/employee/${me.employeeId}`),
      api.get(`/performance/employees/${me.employeeId}/history`),
    ])
      .then(([a, r]) => {
        setAssignments(Array.isArray(a.data) ? a.data : []);
        setRecords(Array.isArray(r.data) ? r.data : []);
      })
      .catch((e) => {
        if (e?.response?.status === 401) router.push('/login');
        else toast.error('Failed to load performance data.');
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  const openAssignments = assignments.filter((a) =>
    [AppraisalAssignmentStatus.NOT_STARTED, AppraisalAssignmentStatus.IN_PROGRESS].includes(a.status),
  );

  return (
    <AppShell title="Performance">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open assignments</CardTitle>
            <CardDescription>Appraisals you need to complete</CardDescription>
          </CardHeader>
          <CardContent>
            {openAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open assignments.</p>
            ) : (
              <ScrollArea className="h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cycle</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openAssignments.map((a) => (
                      <TableRow key={a._id}>
                        <TableCell>{a.cycleId.name}</TableCell>
                        <TableCell>{a.templateId.name}</TableCell>
                        <TableCell>{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          {a.managerProfileId.firstName} {a.managerProfileId.lastName}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => router.push(`/performance/assignments/${a._id}`)}>
                            Start
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appraisal history</CardTitle>
            <CardDescription>Records already published by HR</CardDescription>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appraisals yet.</p>
            ) : (
              <ScrollArea className="h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cycle</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell>{r.cycleId.name}</TableCell>
                        <TableCell>{r.templateId.name}</TableCell>
                        <TableCell>{r.totalScore}</TableCell>
                        <TableCell>{r.overallRatingLabel || '-'}</TableCell>
                        <TableCell>
                          <Badge className={statusColour(r.status)}>{r.status.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => router.push(`/performance/records/${r._id}`)}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}