'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { AppraisalAssignmentStatus } from '@/types/performance';

type Assignment = {
  _id: string;
  cycleId: { name: string };
  templateId: {
    name: string;
    questions: {
      competency: string;
      questionText: string;
      maxScore: number;
    }[];
  };
  managerProfileId: { firstName: string; lastName: string };
  status: AppraisalAssignmentStatus;
};

export default function AssignmentFillPage() {
  const router = useRouter();
  const { id } = useParams();
  const [a, setA] = useState<Assignment | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const me = getCurrentUser();
    if (!me?.employeeId) { router.push('/login'); return; }
    api.get(`/performance/assignments/${id}`)
       .then((r) => setA(r.data))
       .catch(() => toast.error('Load failed'));
  }, [id, router]);

  if (!a) return <p className="text-muted-foreground">Loading assignment…</p>;

  const handleSubmit = async () => {
    if (Object.keys(scores).length !== a.templateId.questions.length) {
      toast.error('Please score every question');
      return;
    }
    setSaving(true);
    const ratings = a.templateId.questions.map((q) => ({
      competency: q.competency,
      ratingValue: scores[q.competency] || 0,
    }));
    try {
      await api.post('/performance/records', {
        assignmentId: a._id,
        ratings,
        comment,
      });
      toast.success('Appraisal submitted');
      router.push('/performance');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Submit failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Complete appraisal" subtitle={a.cycleId.name}>
      <Card>
        <CardHeader>
          <CardTitle>{a.templateId.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manager: {a.managerProfileId.firstName} {a.managerProfileId.lastName}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {a.templateId.questions.map((q) => (
            <div key={q.competency} className="space-y-2">
              <Label>
                {q.questionText} <span className="text-muted-foreground">(max {q.maxScore})</span>
              </Label>
              <Input
                type="number"
                min={0}
                max={q.maxScore}
                placeholder="Score"
                onChange={(e) =>
                  setScores({ ...scores, [q.competency]: Number(e.target.value) })
                }
              />
            </div>
          ))}

          <div className="space-y-2">
            <Label>Overall comment</Label>
            <Textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Submitting…' : 'Submit'}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}