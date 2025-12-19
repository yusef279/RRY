'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Calendar, FileText, AlertCircle, CheckCircle2, Clock, X, RefreshCw, ChevronRight, Shield, UserCheck } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { AppraisalRecordStatus, AppraisalDisputeStatus } from '@/types/performance';

/* --------------  TYPES  unchanged  -------------- */
type DisputeInfo = {
  _id: string;
  status: AppraisalDisputeStatus;
  reason: string;
  details?: string;
  resolutionSummary?: string;
  resolvedAt?: string;
  resolvedByEmployeeId?: { firstName: string; lastName: string };
  hrAdjusted: boolean;
  disputeCount: number;
  updatedAppraisal?: {
    totalScore: number;
    overallRatingLabel: string;
    ratings?: Array<{ key: string; title: string; ratingValue: number; comments?: string }>;
  };
};

type AppraisalRecord = {
  _id: string;
  cycleId: { _id: string; name: string };
  templateId: { _id: string; name: string };
  managerProfileId: { firstName: string; lastName: string };
  totalScore: number;
  overallRatingLabel: string;
  ratings: Array<{ key: string; title: string; ratingValue: number; comments: string }>;
  strengths: string;
  improvementAreas: string;
  managerSummary: string;
  status: AppraisalRecordStatus;
  hrPublishedAt: string | Date;
  employeeAcknowledgedAt: string | Date | null;
  employeeAcknowledgementComment: string | null;
  assignmentId?: { _id: string } | string;
  disputeId?: string;
  hrAdjusted?: boolean;
  adjustedBy?: { firstName: string; lastName: string; role: string };
};

/* --------------  COMPONENT  -------------- */
export default function EmployeeAppraisalsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<AppraisalRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);
  const [acknowledgmentComment, setAcknowledgmentComment] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDetails, setDisputeDetails] = useState('');
  const [filingDispute, setFilingDispute] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'acknowledged' | 'all'>('pending');

  const [disputeInfo, setDisputeInfo] = useState<DisputeInfo | null>(null);
  const [originalRecord, setOriginalRecord] = useState<AppraisalRecord | null>(null);
  const [updatedRecord, setUpdatedRecord] = useState<AppraisalRecord | null>(null);

  const selectedRecord = records.find((r) => r._id === selectedRecordId) ?? null;
  const displayRecord = updatedRecord || selectedRecord;

  /* --------------  DATA  -------------- */
  const loadAppraisals = async () => {
    try {
      setRefreshing(true);
      const me = getCurrentUser();
      if (!me?.employeeId) return router.replace('/login');
      const res = await api.get(`/performance/employees/${me.employeeId}/history`);
      const published = Array.isArray(res.data) ? res.data : [];
      const validRecords = published.filter((r) => r.assignmentId);
      const sorted = validRecords.sort((a, b) => new Date(b.hrPublishedAt).getTime() - new Date(a.hrPublishedAt).getTime());
      setRecords(sorted);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load appraisals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadRecordDetails = async (recordId: string) => {
    try {
      const me = getCurrentUser();
      if (!me?.employeeId) return;
      const recordRes = await api.get(`/performance/records/${recordId}`);
      const recordData = recordRes.data;
      setOriginalRecord(null);
      setUpdatedRecord(null);
      setDisputeInfo(null);

      try {
        const disputeRes = await api.get(`/performance/disputes/appraisal/${recordId}/employee/${me.employeeId}`);
        const d = disputeRes.data as DisputeInfo;
        setDisputeInfo(d);
        if (d.status === AppraisalDisputeStatus.ADJUSTED && d.updatedAppraisal) {
          setOriginalRecord(recordData);
          setUpdatedRecord({ ...recordData, ...d.updatedAppraisal, hrAdjusted: true, adjustedBy: { firstName: 'HR', lastName: 'Manager', role: 'HR Manager' } });
        } else if (d.hrAdjusted) {
          setUpdatedRecord({ ...recordData, hrAdjusted: true, adjustedBy: { firstName: 'HR', lastName: 'Manager', role: 'HR Manager' } });
        }
      } catch {
        // no dispute
      }
    } catch {
      toast.error('Failed to load appraisal details');
    }
  };

  useEffect(() => {
    loadAppraisals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------  HANDLERS  -------------- */
  const handleAcknowledge = async () => {
    if (!displayRecord) return;
    const me = getCurrentUser();
    if (!me?.employeeId) return;
    if (disputeInfo && (disputeInfo.status === AppraisalDisputeStatus.OPEN || disputeInfo.status === AppraisalDisputeStatus.UNDER_REVIEW)) {
      toast.error('Cannot acknowledge while dispute is pending resolution');
      return;
    }
    setAcknowledging(true);
    try {
      await api.patch(`/performance/records/${displayRecord._id}/acknowledge`, { employeeId: me.employeeId, comment: acknowledgmentComment });
      toast.success('Appraisal acknowledged');
      await loadAppraisals();
      setAcknowledgmentComment('');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Acknowledgment failed');
    } finally {
      setAcknowledging(false);
    }
  };

  const handleRaiseDispute = async () => {
    if (!selectedRecord || !disputeReason.trim()) return toast.error('Please enter a reason for the dispute');
    const me = getCurrentUser();
    if (!me?.employeeId) return;
    if (selectedRecord.employeeAcknowledgedAt) return toast.error('Cannot dispute an already acknowledged appraisal');
    // ❗️Permanent block after any resolved dispute
    if (disputeInfo && (disputeInfo.status === AppraisalDisputeStatus.ADJUSTED || disputeInfo.status === AppraisalDisputeStatus.REJECTED))
      return toast.error('Dispute already resolved. You cannot file another dispute for this appraisal.');
    if (disputeInfo) return toast.error('You have already filed a dispute for this appraisal. Only one dispute allowed.');
    let assignmentId: string | undefined;
    if (selectedRecord.assignmentId) {
      if (typeof selectedRecord.assignmentId === 'object' && selectedRecord.assignmentId._id) assignmentId = selectedRecord.assignmentId._id;
      else if (typeof selectedRecord.assignmentId === 'string') assignmentId = selectedRecord.assignmentId;
    }
    if (!assignmentId) return toast.error('Cannot file dispute: No assignment found');
    setFilingDispute(true);
    try {
      await api.post('/performance/disputes', {
        appraisalId: selectedRecord._id,
        assignmentId,
        cycleId: selectedRecord.cycleId._id,
        raisedByEmployeeId: me.employeeId,
        reason: disputeReason,
        details: disputeDetails || undefined,
      });
      toast.success('Dispute filed successfully');
      await loadRecordDetails(selectedRecord._id);
      setShowDisputeForm(false);
      setDisputeReason('');
      setDisputeDetails('');
    } catch (e: any) {
      if (e.response?.status === 409) toast.error('A dispute already exists for this appraisal. Only one dispute allowed.');
      else toast.error(e.response?.data?.message || 'Failed to file dispute');
    } finally {
      setFilingDispute(false);
    }
  };

  /* --------------  HELPERS  -------------- */
  const daysSince = (d: string | Date) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

  // Button visibility: only if no dispute ever exists
  const canRaiseDispute = selectedRecord && selectedRecord.assignmentId && !selectedRecord.employeeAcknowledgedAt && !disputeInfo && daysSince(selectedRecord.hrPublishedAt) <= 7;
  const canAcknowledge = displayRecord && !displayRecord.employeeAcknowledgedAt && (!disputeInfo || disputeInfo.status === AppraisalDisputeStatus.ADJUSTED || disputeInfo.status === AppraisalDisputeStatus.REJECTED);

  const filteredRecords = records.filter((r) => (activeTab === 'all' ? true : activeTab === 'pending' ? !r.employeeAcknowledgedAt : !!r.employeeAcknowledgedAt));

  /* --------------  LOADING / EMPTY  -------------- */
  if (loading)
    return (
      <AppShell title="My Appraisals" allowedRoles={['department employee', 'HR Employee']}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </AppShell>
    );

  if (!records.length)
    return (
      <AppShell title="My Appraisals" allowedRoles={['department employee', 'HR Employee']}>
        <Card className="max-w-xl mx-auto">
          <CardContent className="pt-12 pb-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Appraisals Yet</h3>
            <p className="text-gray-600">Your performance appraisals will appear here once published by HR.</p>
          </CardContent>
        </Card>
      </AppShell>
    );

  /* --------------  RENDER  -------------- */
  return (
    <AppShell title="My Appraisals" allowedRoles={['department employee', 'HR Employee']}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Performance Appraisals</h1>
            <p className="text-gray-600 mt-1">Review and acknowledge your evaluations</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">{records.filter((r) => !r.employeeAcknowledgedAt).length} pending</div>
            <Button variant="outline" onClick={loadAppraisals} disabled={refreshing} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left – List */}
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Appraisal History</CardTitle>
                  <Badge variant="outline">{records.length} appraisals</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <Tabs defaultValue="pending" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                  <TabsList className="grid grid-cols-3 mb-4">
                    <TabsTrigger value="pending">
                      Pending
                      {!!records.filter((r) => !r.employeeAcknowledgedAt).length && (
                        <span className="ml-2 h-5 w-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">{records.filter((r) => !r.employeeAcknowledgedAt).length}</span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="acknowledged">Acknowledged</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                  </TabsList>
                  <div className="space-y-2 overflow-y-auto pr-2 flex-1">
                    {filteredRecords.map((record) => (
                      <button
                        key={record._id}
                        onClick={() => {
                          setSelectedRecordId(record._id);
                          loadRecordDetails(record._id);
                        }}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${selectedRecordId === record._id ? 'border-blue-500 bg-blue-50 shadow' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="font-medium text-sm">{record.cycleId.name}</span>
                              {record.hrAdjusted && <Shield className="h-3 w-3 text-purple-500" />}
                            </div>
                            <p className="text-xs text-gray-500 mb-2">{new Date(record.hrPublishedAt).toLocaleDateString()}</p>
                            <div className="flex items-center gap-2">{record.employeeAcknowledgedAt ? <Badge className="bg-green-100 text-green-800 border-green-200">Acknowledged</Badge> : <Badge variant="outline">Pending</Badge>}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="text-lg font-bold text-gray-900">{record.totalScore.toFixed(1)}</div>
                            <Badge variant="secondary">{record.overallRatingLabel}</Badge>
                            {selectedRecordId === record._id && <ChevronRight className="h-4 w-4 text-blue-500" />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right – Detail */}
          <div className="lg:col-span-2">
            {displayRecord ? (
              <div className="space-y-6">
                {/* Score Header */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-lg bg-blue-100">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-xl font-bold text-gray-900">{displayRecord.cycleId.name}</h2>
                              {/* 👇 permanent resolved label */}
                              {disputeInfo && (disputeInfo.status === AppraisalDisputeStatus.ADJUSTED || disputeInfo.status === AppraisalDisputeStatus.REJECTED) && (
                                <Badge
                                  className={`${
                                    disputeInfo.status === AppraisalDisputeStatus.ADJUSTED
                                      ? 'bg-green-100 text-green-800 border-green-200'
                                      : 'bg-red-100 text-red-800 border-red-200'
                                  }`}
                                >
                                  Dispute {disputeInfo.status}
                                </Badge>
                              )}
                              {displayRecord.hrAdjusted && (
                                <Badge className="bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1">
                                  <Shield className="h-3 w-3" />
                                  HR Adjustment Applied
                                </Badge>
                              )}
                              {disputeInfo && (
                                <Badge variant="outline" className="text-xs">
                                  Dispute {disputeInfo.disputeCount}/1 used
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{displayRecord.templateId.name}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-2 rounded border bg-gray-50">
                            <p className="text-xs text-gray-500">Published</p>
                            <p className="font-medium text-sm">{new Date(displayRecord.hrPublishedAt).toLocaleDateString()}</p>
                          </div>
                          <div className="p-2 rounded border bg-gray-50">
                            <p className="text-xs text-gray-500">Appraised By</p>
                            <p className="font-medium text-sm">
                              {displayRecord.managerProfileId.firstName} {displayRecord.managerProfileId.lastName}
                            </p>
                          </div>
                          {displayRecord.employeeAcknowledgedAt ? (
                            <div className="p-2 rounded border bg-green-50">
                              <p className="text-xs text-gray-500">Acknowledged</p>
                              <p className="font-medium text-sm text-green-700">{new Date(displayRecord.employeeAcknowledgedAt).toLocaleDateString()}</p>
                            </div>
                          ) : (
                            <div className="p-2 rounded border bg-blue-50">
                              <p className="text-xs text-gray-500">Status</p>
                              <p className="font-medium text-sm text-blue-700">Pending</p>
                            </div>
                          )}
                          {displayRecord.adjustedBy && (
                            <div className="p-2 rounded border bg-purple-50">
                              <p className="text-xs text-gray-500">Adjusted By</p>
                              <div className="flex items-center gap-1">
                                <UserCheck className="h-3 w-3 text-purple-500" />
                                <p className="font-medium text-sm text-purple-700">
                                  {displayRecord.adjustedBy.firstName} {displayRecord.adjustedBy.lastName}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="inline-flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                          <p className="text-sm font-medium text-gray-600">Overall Score</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-gray-900">{displayRecord.totalScore.toFixed(1)}</span>
                            <Badge
                              className={`text-sm ${
                                displayRecord.overallRatingLabel === 'Outstanding'
                                  ? 'bg-green-600'
                                  : displayRecord.overallRatingLabel === 'Exceeds Expectations'
                                  ? 'bg-blue-600'
                                  : 'bg-gray-600'
                              }`}
                            >
                              {displayRecord.overallRatingLabel}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Comparison Card */}
                {originalRecord && updatedRecord && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Rating Adjustments (HR Modified)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 rounded bg-gray-50 border">
                          <p className="text-xs text-gray-500">Original Score</p>
                          <p className="text-lg font-bold">{originalRecord.totalScore.toFixed(1)}</p>
                          <Badge variant="outline">{originalRecord.overallRatingLabel}</Badge>
                        </div>
                        <div className="text-center p-3 rounded bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
                          <p className="text-xs text-gray-500">Updated Score</p>
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-lg font-bold text-green-700">{updatedRecord.totalScore.toFixed(1)}</span>
                            {updatedRecord.totalScore !== originalRecord.totalScore && (
                              <Badge className={updatedRecord.totalScore > originalRecord.totalScore ? 'bg-green-600' : 'bg-red-600'}>
                                {updatedRecord.totalScore > originalRecord.totalScore ? '+' : ''}
                                {(updatedRecord.totalScore - originalRecord.totalScore).toFixed(1)}
                              </Badge>
                            )}
                          </div>
                          <Badge className="bg-green-100 text-green-800">{updatedRecord.overallRatingLabel}</Badge>
                          <p className="text-xs text-green-600 mt-1">HR Adjustment Applied</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Manager Feedback */}
                <Card>
                  <CardHeader>
                    <CardTitle>Manager Feedback</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {displayRecord.managerSummary && (
                      <div>
                        <Label className="font-medium mb-2 block">Summary</Label>
                        <div className="p-3 rounded bg-blue-50 border border-blue-200">
                          <p className="text-sm">{displayRecord.managerSummary}</p>
                        </div>
                      </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-4">
                      {displayRecord.strengths && (
                        <div>
                          <Label className="font-medium mb-2 block">Strengths</Label>
                          <div className="p-3 rounded bg-green-50 border border-green-200">
                            <p className="text-sm">{displayRecord.strengths}</p>
                          </div>
                        </div>
                      )}
                      {displayRecord.improvementAreas && (
                        <div>
                          <Label className="font-medium mb-2 block">Areas for Improvement</Label>
                          <div className="p-3 rounded bg-amber-50 border border-amber-200">
                            <p className="text-sm">{displayRecord.improvementAreas}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Rating Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Rating Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {displayRecord.ratings.map((rating) => (
                        <div key={rating.key} className="p-3 rounded border bg-white">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{rating.title}</p>
                              {rating.comments && <p className="text-xs text-gray-600 mt-1">{rating.comments}</p>}
                            </div>
                            <Badge variant="secondary">{rating.ratingValue.toFixed(1)}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Acknowledgment */}
                <Card>
                  <CardHeader>
                    <CardTitle>Acknowledgment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {displayRecord.employeeAcknowledgedAt ? (
                      <div className="space-y-3">
                        <div className="p-3 rounded bg-green-50 border border-green-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <p className="font-medium text-green-800">Appraisal Acknowledged</p>
                          </div>
                          <p className="text-sm text-green-700 mt-1">You acknowledged this appraisal on {new Date(displayRecord.employeeAcknowledgedAt).toLocaleDateString()}</p>
                        </div>
                        {displayRecord.employeeAcknowledgementComment && (
                          <div className="p-3 rounded border bg-white">
                            <p className="text-sm font-medium text-gray-700 mb-1">Your Comments</p>
                            <p className="text-sm text-gray-800">"{displayRecord.employeeAcknowledgementComment}"</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {disputeInfo && (disputeInfo.status === AppraisalDisputeStatus.OPEN || disputeInfo.status === AppraisalDisputeStatus.UNDER_REVIEW) && (
                          <div className="p-3 rounded bg-yellow-50 border-2 border-yellow-300">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-yellow-800">⚠️ Acknowledgment Locked</p>
                                <p className="text-sm text-yellow-700">You cannot acknowledge this appraisal while your dispute is pending resolution.</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {canAcknowledge && (
                          <>
                            <div>
                              <Label className="font-medium text-gray-700 mb-2 block">Add Comments (Optional)</Label>
                              <Textarea
                                placeholder="Add any comments about this appraisal..."
                                value={acknowledgmentComment}
                                onChange={(e) => setAcknowledgmentComment(e.target.value)}
                                className="min-h-[100px]"
                              />
                            </div>
                            <Button onClick={handleAcknowledge} disabled={acknowledging} className="w-full gap-2">
                              {acknowledging ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  Acknowledging...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-5 w-5" />
                                  {displayRecord.hrAdjusted ? 'Acknowledge HR Adjusted Appraisal' : 'Acknowledge Appraisal'}
                                </>
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dispute Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Dispute Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {disputeInfo ? (
                      <div className="space-y-3">
                        <div className="p-3 rounded border bg-gray-50">
                          <p className="font-medium text-sm mb-1">Your Dispute Reason</p>
                          <p className="text-sm">{disputeInfo.reason}</p>
                          {disputeInfo.details && <p className="text-sm mt-2 text-gray-600">{disputeInfo.details}</p>}
                        </div>
                        <div className="p-3 rounded border bg-blue-50">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-sm">Status: {disputeInfo.status.replace('_', ' ')}</p>
                            <Badge variant="outline">Dispute {disputeInfo.disputeCount}/1 used</Badge>
                          </div>
                          <p className="text-sm">
                            {disputeInfo.status === AppraisalDisputeStatus.OPEN || disputeInfo.status === AppraisalDisputeStatus.UNDER_REVIEW
                              ? 'Your dispute is being reviewed by HR.'
                              : disputeInfo.status === AppraisalDisputeStatus.ADJUSTED
                              ? 'Dispute resolved with HR adjustments applied.'
                              : 'Dispute rejected. Original ratings remain unchanged.'}
                          </p>
                          {disputeInfo.disputeCount >= 1 && (
                            <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                              <p className="text-xs font-medium text-amber-800">⚠️ One dispute used. No further disputes allowed for this appraisal.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : !selectedRecord?.assignmentId ? (
                      <div className="p-4 rounded border bg-gray-50 text-center">
                        <p className="text-gray-600">Dispute option not available for this appraisal.</p>
                      </div>
                    ) : selectedRecord.employeeAcknowledgedAt ? (
                      <div className="p-4 rounded border bg-gray-50">
                        <p className="text-gray-600">Appraisal already acknowledged. Dispute window closed.</p>
                      </div>
                    ) : daysSince(selectedRecord.hrPublishedAt) > 7 ? (
                      <div className="p-4 rounded border bg-gray-50">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <p className="text-gray-600">The 7-day dispute window has closed.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-3 rounded border bg-blue-50">
                          <div className="flex items-center justify-between">
                            <p className="text-sm">You have {7 - daysSince(selectedRecord.hrPublishedAt)} days remaining to file a dispute.</p>
                            <Badge variant="outline" className="text-xs bg-amber-50">
                              1 dispute allowed
                            </Badge>
                          </div>
                        </div>
                        {!showDisputeForm ? (
                          <Button variant="outline" onClick={() => setShowDisputeForm(true)} className="w-full gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Raise a Dispute (1 allowed)
                          </Button>
                        ) : (
                          <div className="space-y-4">
                            <div className="p-3 rounded border border-amber-300 bg-amber-50">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-amber-800">One-Time Dispute Rule</p>
                                  <p className="text-xs text-amber-700">You can file only ONE dispute per appraisal. Once submitted, you cannot dispute again even if resolved.</p>
                                </div>
                              </div>
                            </div>
                            <div>
                              <Label>Reason for Dispute *</Label>
                              <Textarea placeholder="Explain your concern..." value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} className="mt-2" rows={3} />
                            </div>
                            <div>
                              <Label>Additional Details (Optional)</Label>
                              <Textarea placeholder="Provide supporting information..." value={disputeDetails} onChange={(e) => setDisputeDetails(e.target.value)} className="mt-2" rows={2} />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={handleRaiseDispute} disabled={filingDispute || !disputeReason.trim()} className="flex-1">
                                {filingDispute ? 'Submitting...' : 'Submit Dispute (1/1)'}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowDisputeForm(false);
                                  setDisputeReason('');
                                  setDisputeDetails('');
                                }}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Select an appraisal to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}