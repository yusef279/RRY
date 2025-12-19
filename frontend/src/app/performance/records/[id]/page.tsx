'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth'; // Import this
import { AppraisalRecordStatus } from '@/types/performance';

export default function RecordDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  
  // Get current user
  const currentUser = getCurrentUser();

  useEffect(() => {
    fetchRecord();
  }, []);

  const fetchRecord = async () => {
    try {
      const res = await api.get(`/performance/records/${id}`);
      setRecord(res.data);
    } catch {
      toast.error('Failed to load record');
      router.push('/performance/records');
    } finally {
      setLoading(false);
    }
  };

  const publish = async () => {
    if (!currentUser?.employeeId) {
      toast.error('You must be logged in as HR staff to publish records');
      return;
    }

    try {
      setPublishing(true);
      
      // Send the correct payload structure
      await api.patch(`/performance/records/${id}/publish`, {
        hrPublishedById: currentUser.employeeId // Send actual employee ID, not null
      });
      
      toast.success('Record published successfully');
      fetchRecord(); // Refresh the record data
    } catch (error: any) {
      // Show more detailed error message
      const errorMessage = error.response?.data?.message || 'Publish failed';
      toast.error(`Failed to publish: ${errorMessage}`);
      console.error('Publish error:', error);
    } finally {
      setPublishing(false);
    }
  };

  if (loading)
    return (
      <AppShell title="Appraisal Record">
        <p>Loading…</p>
      </AppShell>
    );

  if (!record)
    return (
      <AppShell title="Appraisal Record">
        <p>Record not found</p>
      </AppShell>
    );

  const getStatusColor = (status: AppraisalRecordStatus) => {
    switch (status) {
      case AppraisalRecordStatus.MANAGER_SUBMITTED:
        return 'bg-blue-100 text-blue-800';
      case AppraisalRecordStatus.HR_PUBLISHED:
        return 'bg-green-100 text-green-800';
      case AppraisalRecordStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get employee name safely
  const getEmployeeName = () => {
    if (record.employeeProfileId) {
      if (typeof record.employeeProfileId === 'object') {
        return `${record.employeeProfileId.firstName || ''} ${record.employeeProfileId.lastName || ''}`.trim();
      }
    }
    return record.employeeName || '—';
  };

  return (
    <AppShell title="Appraisal Record" allowedRoles={['HR Manager', 'HR Employee']}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">{record.templateId?.name || 'Appraisal Record'}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              ID: {record._id}
            </p>
          </div>
          <Badge className={`text-sm ${getStatusColor(record.status)}`}>
            {record.status.replace('_', ' ')}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Employee</p>
              <p className="text-lg">{getEmployeeName()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cycle</p>
              <p className="text-lg">{record.cycleId?.name || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Score</p>
              <p className="text-lg font-bold">{record.totalScore ?? '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Overall Rating</p>
              <p className="text-lg">{record.overallRatingLabel || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Submitted Date</p>
              <p className="text-lg">
                {record.managerSubmittedAt 
                  ? new Date(record.managerSubmittedAt).toLocaleDateString() 
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Published Date</p>
              <p className="text-lg">
                {record.hrPublishedAt 
                  ? new Date(record.hrPublishedAt).toLocaleDateString() 
                  : 'Not published yet'}
              </p>
            </div>
          </div>

          {/* Ratings section - if available */}
          {record.ratings && record.ratings.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Ratings</h3>
              <div className="space-y-3">
                {record.ratings.map((rating: any, index: number) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {rating.criterionId || `Criterion ${index + 1}`}
                        </p>
                        {rating.comment && (
                          <p className="text-sm text-muted-foreground mt-1">{rating.comment}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {rating.ratingValue ?? rating.weightedScore ?? 'N/A'}
                        </p>
                        {rating.weight && (
                          <p className="text-xs text-muted-foreground">Weight: {rating.weight}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Publish button - only show for manager-submitted records */}
          {record.status === AppraisalRecordStatus.MANAGER_SUBMITTED && (
            <div className="border-t pt-6">
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  This appraisal has been submitted by the manager and is ready for HR review and publication.
                  Publishing will make it visible to the employee.
                </p>
              </div>
              <Button 
                onClick={publish} 
                disabled={publishing}
                className="w-full md:w-auto"
                size="lg"
              >
                {publishing ? 'Publishing...' : 'Publish Record'}
              </Button>
              {publishing && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Publishing record, please wait...
                </p>
              )}
            </div>
          )}

          {/* Already published message */}
          {record.status === AppraisalRecordStatus.HR_PUBLISHED && (
            <div className="border-t pt-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ This appraisal has been published and is visible to the employee.
                  Published on: {new Date(record.hrPublishedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}