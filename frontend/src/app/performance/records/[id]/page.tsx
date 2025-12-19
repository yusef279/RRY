'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { AppraisalRecordStatus } from '@/types/performance';
import { AlertCircle, Info } from 'lucide-react';

export default function RecordDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [cycleStatus, setCycleStatus] = useState<string>('LOADING');
  const [cycleError, setCycleError] = useState<string>('');
  const [cycleName, setCycleName] = useState<string>('—');

  // Get current user
  const currentUser = getCurrentUser();

  useEffect(() => {
    fetchRecord();
  }, [id]); // Added id as dependency

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/performance/records/${id}`);
      const recordData = res.data;
      setRecord(recordData);

      // Extract cycle information safely
      if (recordData?.cycleId) {
        let cycleId: string;

        // Handle both populated and non-populated cycleId
        if (typeof recordData.cycleId === 'object' && recordData.cycleId !== null) {
          // If it's a populated cycle object
          cycleId = recordData.cycleId._id;
          setCycleName(recordData.cycleId.name || '—');
        } else {
          // If it's just an ID string
          cycleId = String(recordData.cycleId);
          // We'll fetch the cycle name separately
          setCycleName('Loading...');
        }

        console.log('Extracted cycle ID:', cycleId);
        await fetchCycleStatus(cycleId);
      } else {
        setCycleStatus('NO_CYCLE');
        setCycleName('No cycle assigned');
      }
    } catch (error) {
      console.error('Failed to load record:', error);
      toast.error('Failed to load record');
      router.push('/performance/records');
    } finally {
      setLoading(false);
    }
  };

  const fetchCycleStatus = async (cycleId: string) => {
    try {
      setCycleStatus('LOADING');
      setCycleError('');

      // Validate cycleId is a string and not an object
      if (typeof cycleId !== 'string' || cycleId.includes('[object')) {
        console.error('Invalid cycleId:', cycleId);
        setCycleError('Invalid cycle ID format');
        setCycleStatus('INVALID_ID');
        return;
      }

      // Make sure it's a valid ObjectId format (24 hex chars)
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(cycleId)) {
        console.error('Invalid ObjectId format:', cycleId);
        setCycleError('Invalid cycle ID format');
        setCycleStatus('INVALID_FORMAT');
        return;
      }

      // Try to fetch cycle details
      const cycleRes = await api.get(`/performance/cycles/${cycleId}`);
      const cycleData = cycleRes.data;

      if (cycleData) {
        setCycleStatus(cycleData?.status || 'UNKNOWN');
        if (!cycleName || cycleName === 'Loading...') {
          setCycleName(cycleData.name || '—');
        }
      } else {
        setCycleError('Cycle data not found in response');
        setCycleStatus('NOT_FOUND');
      }
    } catch (error: any) {
      console.error('Failed to fetch cycle status:', error);

      // Handle different error scenarios
      if (error.response?.status === 400) {
        setCycleError('Invalid cycle ID');
        setCycleStatus('INVALID_ID');
      } else if (error.response?.status === 404) {
        setCycleError('Cycle not found');
        setCycleStatus('NOT_FOUND');
      } else if (error.response?.status === 403) {
        setCycleError('Access denied to cycle information');
        setCycleStatus('ACCESS_DENIED');
      } else if (error.response?.status >= 500) {
        setCycleError('Server error while fetching cycle');
        setCycleStatus('SERVER_ERROR');
      } else if (error.message?.includes('Network Error')) {
        setCycleError('Network error - cannot connect to server');
        setCycleStatus('NETWORK_ERROR');
      } else {
        setCycleError('Unable to determine cycle status');
        setCycleStatus('ERROR');
      }
    }
  };

  const publish = async () => {
    if (!currentUser?.employeeId) {
      toast.error('You must be logged in as HR staff to publish records');
      return;
    }

    if (!isCycleActive()) {
      toast.error('Cannot publish: Cycle is not active');
      return;
    }

    try {
      setPublishing(true);

      await api.patch(`/performance/records/${id}/publish`, {
        hrPublishedById: currentUser.employeeId
      });

      toast.success('Record published successfully');
      fetchRecord(); // Refresh the record data
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Publish failed';
      toast.error(`Failed to publish: ${errorMessage}`);
      console.error('Publish error:', error);
    } finally {
      setPublishing(false);
    }
  };

  const isCycleActive = () => {
    return cycleStatus === 'ACTIVE';
  };

  const getCycleStatusMessage = () => {
    switch (cycleStatus) {
      case 'LOADING':
        return 'Checking cycle status...';
      case 'NO_CYCLE':
        return 'No cycle associated with this record';
      case 'INVALID_ID':
        return 'Invalid cycle ID format';
      case 'INVALID_FORMAT':
        return 'Invalid ObjectId format';
      case 'NOT_FOUND':
        return 'Associated cycle not found';
      case 'ACCESS_DENIED':
        return 'Access denied to cycle information';
      case 'SERVER_ERROR':
        return 'Unable to check cycle status (server error)';
      case 'NETWORK_ERROR':
        return 'Network error - cannot connect to server';
      case 'PLANNED':
        return 'Cycle is planned but not yet active';
      case 'CLOSED':
        return 'Cycle is closed';
      case 'ARCHIVED':
        return 'Cycle is archived';
      case 'ERROR':
      case 'UNKNOWN':
        return 'Unable to determine cycle status';
      case 'ACTIVE':
        return 'Cycle is active';
      default:
        return 'Cycle status unknown';
    }
  };

  const getCycleStatusColor = () => {
    switch (cycleStatus) {
      case 'ACTIVE':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'LOADING':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'NO_CYCLE':
      case 'INVALID_ID':
      case 'INVALID_FORMAT':
      case 'NOT_FOUND':
      case 'ERROR':
      case 'UNKNOWN':
      case 'SERVER_ERROR':
      case 'NETWORK_ERROR':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'PLANNED':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'CLOSED':
      case 'ARCHIVED':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  if (loading)
    return (
      <AppShell title="Appraisal Record">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Loading record...</p>
        </div>
      </AppShell>
    );

  if (!record)
    return (
      <AppShell title="Appraisal Record">
        <div className="p-6 text-center">
          <p>Record not found</p>
        </div>
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

  // Check if publishing should be disabled
  const canPublish = record.status === AppraisalRecordStatus.MANAGER_SUBMITTED &&
    isCycleActive() &&
    currentUser?.employeeId &&
    !publishing;

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
              <p className="text-lg">{cycleName}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={`${getCycleStatusColor()}`}
                >
                  {cycleStatus === 'LOADING' ? 'Loading...' :
                    cycleStatus === 'ACTIVE' ? 'Active' :
                      cycleStatus}
                </Badge>
                {cycleError && (
                  <Info className="h-4 w-4 text-gray-500" aria-label={cycleError} />
                )}
              </div>
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

          {/* Cycle status warning if not active */}
          {record.status === AppraisalRecordStatus.MANAGER_SUBMITTED && !isCycleActive() && cycleStatus !== 'LOADING' && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 font-medium">
                    Cycle Status: {getCycleStatusMessage()}
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    {cycleStatus === 'ACTIVE'
                      ? 'This appraisal can be published.'
                      : 'This appraisal cannot be published because its associated cycle is not active.'}
                  </p>
                </div>
              </div>
            </div>
          )}

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

          {/* Publishing section - only show for manager-submitted records */}
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
                disabled={!canPublish}
                className="w-full md:w-auto"
                size="lg"
                variant={canPublish ? "default" : "secondary"}
              >
                {publishing ? 'Publishing...' :
                  canPublish ? 'Publish Record' :
                    cycleStatus === 'LOADING' ? 'Checking Cycle Status...' :
                      !currentUser?.employeeId ? 'Login Required' :
                        'Cannot Publish (Inactive Cycle)'}
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