'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { AppraisalAssignmentStatus } from '@/types/performance';

type Assignment = {
  _id: string;
  employeeProfileId: { firstName: string; lastName: string };
  cycleId: { name: string };
  templateId: { name: string };
  status: AppraisalAssignmentStatus;
};

export default function MyTeamPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Assignment[]>([]);

  useEffect(() => {
    const me = getCurrentUser();
    if (!me?.employeeId) { router.push('/login'); return; }
    api.get(`/performance/assignments/manager/${me.employeeId}`)
       .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
       .catch(() => {});
  }, [router]);

  return (
    <AppShell title="Appraise my team" allowedRoles={['department head']}>
      <Card>
        <CardHeader>
          <CardTitle>My team assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a._id}>
                  <TableCell>{a.employeeProfileId.firstName} {a.employeeProfileId.lastName}</TableCell>
                  <TableCell>{a.cycleId.name}</TableCell>
                  <TableCell>{a.templateId.name}</TableCell>
                  <TableCell>{a.status.replace('_', ' ')}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => router.push(`/performance/assignments/${a._id}`)}>
                      Start
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}