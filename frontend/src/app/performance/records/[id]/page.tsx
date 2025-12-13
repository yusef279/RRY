'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { AppraisalRecordStatus, AppraisalDisputeStatus } from '@/types/performance';

type Record = {
  assignmentId: any;
  _id: string;
  status: AppraisalRecordStatus;
  totalScore: number;
  overallRatingLabel?: string;
  ratings: {
    title: string;
    ratingValue: number;
    comments?: string;
  }[];
  managerSummary?: string;
  strengths?: string;
  improvementAreas?: string;
  cycleId: { name: string };
  templateId: { name: string };
  managerSubmittedAt?: string;
  hrPublishedAt?: string;
  employeeAcknowledgedAt?: string;
};

export default function RecordPage() {
  const router = useRouter();
  const { id } = useParams();
  const [r, setR] = useState<Record | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [showDispute, setShowDispute] = useState(false);
  const me = getCurrentUser();

  useEffect(() => {
    if (!me?.employeeId) { router.push('/login'); return; }
    api.get(`/performance/records/${id}`)
       .then((res) => setR(res.data))
       .catch(() => toast.error('Load failed'));
  }, [id, router]);

  if (!r) return <p className="text-muted-foreground">Loading record…</p>;

  const canAck = r.status === AppraisalRecordStatus.HR_PUBLISHED && !r.employeeAcknowledgedAt;
  const canDispute = r.status === AppraisalRecordStatus.HR_PUBLISHED && !r.employeeAcknowledgedAt;

  const acknowledge = async () => {
    await api.patch(`/performance/records/${r._id}/acknowledge`, {
      employeeId: me?.employeeId,
      comment: '',
    });
    toast.success('Acknowledged');
    router.push('/performance');
  };

  const raiseDispute = async () => {
    if (!disputeReason.trim()) { toast.error('Reason required'); return; }
    await api.post('/performance/disputes', {
      appraisalId: r._id,
      assignmentId: r.assignmentId,
      cycleId: r.cycleId,
      raisedByEmployeeId: me?.employeeId,
      reason: disputeReason,
    });
    toast.success('Dispute raised');
    setShowDispute(false);
    router.push('/performance');
  };

  return (
    <AppShell title="Appraisal record" subtitle={`Cycle: ${r.cycleId.name}`}>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-medium">Template:</span> {r.templateId.name}</p>
            <p><span className="font-medium">Total score:</span> {r.totalScore}</p>
            <p><span className="font-medium">Rating:</span> {r.overallRatingLabel || '—'}</p>
            <p>
              <span className="font-medium">Status:</span>{' '}
              <Badge>{r.status.replace('_', ' ')}</Badge>
            </p>
            <p><span className="font-medium">Submitted:</span> {r.managerSubmittedAt ? new Date(r.managerSubmittedAt).toLocaleDateString() : '—'}</p>
            <p><span className="font-medium">Published:</span> {r.hrPublishedAt ? new Date(r.hrPublishedAt).toLocaleDateString() : '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {canAck && (
              <Button onClick={acknowledge}>Acknowledge</Button>
            )}
            {canDispute && (
              <Button variant="outline" onClick={() => setShowDispute(true)}>
                Raise dispute
              </Button>
            )}

            {showDispute && (
              <div className="space-y-2">
                <label>Explain your concern</label>
                <Textarea
                  rows={3}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Be specific about the issue"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={raiseDispute}>Submit dispute</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowDispute(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ratings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Ratings & Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {r.ratings.map((rt, idx) => (
            <div key={idx} className="border-l-2 border-muted pl-4">
              <p className="font-medium">{rt.title}</p>
              <p className="text-sm text-muted-foreground">Score: {rt.ratingValue}</p>
              {rt.comments && <p className="text-sm mt-1">{rt.comments}</p>}
            </div>
          ))}

          {r.managerSummary && (
            <div>
              <p className="font-medium">Manager summary</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{r.managerSummary}</p>
            </div>
          )}

          {r.strengths && (
            <div>
              <p className="font-medium">Strengths</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{r.strengths}</p>
            </div>
          )}

          {r.improvementAreas && (
            <div>
              <p className="font-medium">Improvement areas</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{r.improvementAreas}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}