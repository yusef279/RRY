'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { AppraisalRecordStatus } from '@/types/performance';

type Record = {
  _id: string;
  status: AppraisalRecordStatus;
  totalScore: number;
  overallRatingLabel?: string;
  cycleId: { _id: string; name: string };
  templateId: { _id: string; name: string };
  employeeName?: string;
  employeeId?: string;
  managerSubmittedAt?: string;
  hrPublishedAt?: string;
};

export default function RecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const me = getCurrentUser();

  useEffect(() => {
    if (!me?.employeeId) {
      router.push('/login');
      return;
    }
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      // 👇 only manager-submitted
      const res = await api.get('/performance/records', {
        params: { status: AppraisalRecordStatus.MANAGER_SUBMITTED },
      });
      setRecords(res.data || []);
    } catch (err) {
      toast.error('Failed to load records');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: AppraisalRecordStatus) => {
    switch (status) {
      case AppraisalRecordStatus.MANAGER_SUBMITTED:
        return 'bg-blue-100 text-blue-800';
      case AppraisalRecordStatus.HR_PUBLISHED:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading)
    return (
      <AppShell title="Appraisal Records" allowedRoles={['HR Manager', 'HR Employee']}>
        <p className="text-muted-foreground">Loading records…</p>
      </AppShell>
    );

  return (
    <AppShell title="Appraisal Records" allowedRoles={['HR Manager', 'HR Employee']}>
      <Card>
        <CardHeader>
          <CardTitle>Manager-Submitted Records</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-muted-foreground py-4">No submitted records.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Employee</th>
                    <th className="text-left py-3 px-4 font-semibold">Cycle</th>
                    <th className="text-left py-3 px-4 font-semibold">Template</th>
                    <th className="text-left py-3 px-4 font-semibold">Score</th>
                    <th className="text-left py-3 px-4 font-semibold">Rating</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{r.employeeName || '—'}</td>
                      <td className="py-3 px-4">{r.cycleId?.name || '—'}</td>
                      <td className="py-3 px-4">{r.templateId?.name || '—'}</td>
                      <td className="py-3 px-4">{r.totalScore ?? '—'}</td>
                      <td className="py-3 px-4">{r.overallRatingLabel || '—'}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(r.status)}>
                          {r.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/performance/records/${r._id}`}>
                          <Button size="sm" variant="outline">
                            Review
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}