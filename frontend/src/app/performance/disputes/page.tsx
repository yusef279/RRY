'use client';

import { useEffect, useState } from 'react';
import { Check, X, Edit, Save, Undo, RefreshCw, Info } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { AppraisalDisputeStatus } from '@/types/performance';

type Dispute = {
  _id: string;
  status: AppraisalDisputeStatus;
  reason: string;
  details?: string;
  resolutionSummary?: string;
  raisedByEmployeeId: { 
    _id: string;
    firstName: string; 
    lastName: string; 
    employeeNumber?: string;
    workEmail?: string;
  };
  appraisalId: { 
    _id: string;
    totalScore?: number;
    overallRatingLabel?: string;
    ratings?: Array<{
      key: string;
      title: string;
      ratingValue: number;
      comments?: string;
      maxScore?: number;
    }>;
    managerSummary?: string;
    strengths?: string;
    improvementAreas?: string;
    templateId?: string;
    templateName?: string;
  };
  assignmentId?: {
    _id: string;
  };
  cycleId?: {
    _id: string;
    name?: string;
  };
  submittedAt: string;
  resolvedAt?: string;
  resolvedByEmployeeId?: {
    firstName: string;
    lastName: string;
  };
  updatedAppraisal?: {
    totalScore: number;
    overallRatingLabel: string;
    ratings?: Array<{
      key: string;
      title: string;
      ratingValue: number;
      comments?: string;
    }>;
  };
};

type TemplateCriterion = {
  key: string;
  title: string;
  details?: string;
  weight: number;
  maxScore: number;
  required: boolean;
};

type RatingScale = {
  type: string;
  min: number;
  max: number;
  step: number;
  labels: string[];
};

type Rating = {
  key: string;
  title: string;
  originalValue: number;
  newValue: number;
  comments: string;
  maxScore?: number;
  weight?: number;
  required?: boolean;
  templateDetails?: string;
  originalWeightedScore?: number;
  newWeightedScore?: number;
};

type AppraisalDetails = {
  _id: string;
  ratings: Rating[];
  overallRatingLabel: string;
  managerSummary: string;
  strengths: string;
  improvementAreas: string;
  totalScore: number;
  newTotalScore?: number;
  templateName?: string;
  templateCriteria?: TemplateCriterion[];
  ratingScale?: RatingScale;
  maxPossibleScore?: number;
  weightedTotalScore?: number;
  newWeightedTotalScore?: number;
};

const statusBadge = (s: AppraisalDisputeStatus) => {
  switch (s) {
    case AppraisalDisputeStatus.OPEN:
      return 'bg-red-100 text-red-800 border-red-200';
    case AppraisalDisputeStatus.UNDER_REVIEW:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case AppraisalDisputeStatus.ADJUSTED:
      return 'bg-green-100 text-green-800 border-green-200';
    case AppraisalDisputeStatus.REJECTED:
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status: AppraisalDisputeStatus) => {
  switch (status) {
    case AppraisalDisputeStatus.OPEN:
      return <div className="h-2 w-2 rounded-full bg-red-500"></div>;
    case AppraisalDisputeStatus.UNDER_REVIEW:
      return <div className="h-2 w-2 rounded-full bg-yellow-500"></div>;
    case AppraisalDisputeStatus.ADJUSTED:
      return <Check className="h-3 w-3 text-green-600" />;
    case AppraisalDisputeStatus.REJECTED:
      return <X className="h-3 w-3 text-gray-600" />;
    default:
      return null;
  }
};

// Helper to calculate weighted score
const calculateWeightedScore = (ratingValue: number | undefined | null | string, maxScore: number, weight: number): number => {
  // Convert to number if it's a string, otherwise use 0
  const numRatingValue = ratingValue === undefined || ratingValue === null || ratingValue === '' 
    ? 0 
    : Number(ratingValue);
  
  if (isNaN(numRatingValue) || numRatingValue === 0) return 0;
  
  // Calculate percentage of max score
  const normalizedScore = (numRatingValue / maxScore) * 100;
  
  // Apply weight
  return (normalizedScore * weight) / 100;
}; 

// Get rating label from scale
const getRatingLabel = (value: number, ratingScale?: RatingScale): string => {
  if (!ratingScale?.labels || !Array.isArray(ratingScale.labels) || ratingScale.labels.length === 0) {
    return '';
  }
  
  const { min, max } = ratingScale;
  const range = max - min;
  
  if (range === 0) return ratingScale.labels[0] || '';
  
  const index = Math.round(((value - min) / range) * (ratingScale.labels.length - 1));
  
  return ratingScale.labels[Math.max(0, Math.min(index, ratingScale.labels.length - 1))] || '';
};

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [decision, setDecision] = useState<AppraisalDisputeStatus>(AppraisalDisputeStatus.ADJUSTED);
  const [appraisalDetails, setAppraisalDetails] = useState<AppraisalDetails | null>(null);
  const [showRatingEditor, setShowRatingEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [savingRatings, setSavingRatings] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const currentUser = getCurrentUser();

  // Load disputes
  const loadDisputes = async () => {
    try {
      setLoading(true);
      let params: any = {};
      
      if (activeTab === 'pending') {
        params.status = [AppraisalDisputeStatus.OPEN, AppraisalDisputeStatus.UNDER_REVIEW];
      } else if (activeTab === 'resolved') {
        params.status = [AppraisalDisputeStatus.ADJUSTED, AppraisalDisputeStatus.REJECTED];
      }
      
      const response = await api.get('/performance/disputes', { params });
      const data = Array.isArray(response.data) ? response.data : [];
      setDisputes(data);
    } catch (error: any) {
      console.error('Error loading disputes:', error);
      toast.error(error.response?.data?.message || 'Failed to load disputes');
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, [activeTab]);

  // Load appraisal details with template data
  const loadAppraisalDetails = async (appraisalId: string) => {
    try {
      // Fetch appraisal details
      const appraisalResponse = await api.get(`/performance/records/${appraisalId}`);
      const appraisalData = appraisalResponse.data;
      
      console.log('📊 Appraisal data:', appraisalData);
      
      // Also fetch the template to get criteria and rating scale
      let templateCriteria: TemplateCriterion[] = [];
      let templateName = 'Unknown Template';
      let ratingScale: RatingScale | undefined;
      let maxPossibleScore = 0;
      
      if (appraisalData.templateId) {
        try {
          const templateResponse = await api.get(`/performance/templates/${appraisalData.templateId}`);
          const template = templateResponse.data;
          
          console.log('📄 Template data:', template);
          
          if (template.criteria && Array.isArray(template.criteria)) {
            templateCriteria = template.criteria as TemplateCriterion[];
            templateName = template.name || 'Unknown Template';
            ratingScale = template.ratingScale;
            
            // Calculate max possible score (sum of all max scores)
            maxPossibleScore = templateCriteria.reduce((sum, criterion) => sum + (criterion.maxScore || 5), 0);
          }
        } catch (error) {
          console.warn('Could not fetch template criteria:', error);
        }
      }
      
      // Transform ratings data with template criteria
      const ratings: Rating[] = (appraisalData.ratings || []).map((r: any) => {
        // Find matching criterion from template
        const criterion = templateCriteria.find((c: any) => c.key === r.key || c.title === r.title);
        
        const maxScore = criterion?.maxScore || r.maxScore || ratingScale?.max || 5;
        const weight = criterion?.weight || 100; // Default to 100% if not specified
        
        // Calculate weighted scores
        const originalWeightedScore = calculateWeightedScore(r.ratingValue || 0, maxScore, weight);
        
        return {
          key: r.key || r.title,
          title: r.title || 'Untitled',
          originalValue: r.ratingValue || 0,
          newValue: r.ratingValue || 0,
          comments: r.comments || '',
          maxScore,
          weight,
          required: criterion?.required || false,
          templateDetails: criterion?.details,
          originalWeightedScore,
          newWeightedScore: originalWeightedScore // Initialize new weighted score as same as original
        };
      });
      
      // Calculate current totals
      const currentRawTotal = ratings.reduce((sum, r) => sum + r.originalValue, 0);
      const currentWeightedTotal = ratings.reduce((sum, r) => sum + (r.originalWeightedScore || 0), 0);
      
      console.log('📈 Calculated totals:', {
        rawTotal: currentRawTotal,
        weightedTotal: currentWeightedTotal,
        maxPossibleScore
      });
      
      setAppraisalDetails({
        _id: appraisalData._id,
        ratings,
        overallRatingLabel: appraisalData.overallRatingLabel || '',
        managerSummary: appraisalData.managerSummary || '',
        strengths: appraisalData.strengths || '',
        improvementAreas: appraisalData.improvementAreas || '',
        totalScore: appraisalData.totalScore || currentRawTotal,
        weightedTotalScore: currentWeightedTotal,
        templateName,
        templateCriteria,
        ratingScale,
        maxPossibleScore
      });
      
    } catch (error) {
      console.error('Failed to load appraisal details:', error);
      toast.error('Could not load appraisal details');
    }
  };

  // Handle dispute selection
  const handleSelectDispute = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setDecision(AppraisalDisputeStatus.ADJUSTED);
    setResolutionSummary('');
    setShowRatingEditor(false);
    if (dispute.appraisalId?._id) {
      loadAppraisalDetails(dispute.appraisalId._id);
    }
  };

  // Update a rating
// Update a rating - FIXED VERSION
const updateRating = (index: number, value: string) => {
  if (!appraisalDetails) return;
  
  const updatedRatings = [...appraisalDetails.ratings];
  const rating = updatedRatings[index];
  if (!rating) return;
  
  // Convert string to number, default to 0 if empty
  const numValue = value === '' ? 0 : parseFloat(value);
  
  // Validate and clamp the value
  const clampedValue = Math.min(Math.max(numValue, 0), rating.maxScore || 5);
  
  // Calculate new weighted score
  const newWeightedScore = calculateWeightedScore(clampedValue, rating.maxScore || 5, rating.weight || 100);
  
  updatedRatings[index] = {
    ...rating,
    newValue: clampedValue,
    newWeightedScore
  };
  
  // Calculate new totals
  const newRawTotal = updatedRatings.reduce((sum, r) => sum + r.newValue, 0);
  const newWeightedTotal = updatedRatings.reduce((sum, r) => sum + (r.newWeightedScore || 0), 0);
  
  setAppraisalDetails({
    ...appraisalDetails,
    ratings: updatedRatings,
    newTotalScore: newRawTotal,
    newWeightedTotalScore: newWeightedTotal
  });
};

// Reset ratings to original values
  const resetRatings = () => {
    if (!appraisalDetails) return;
    
    const resetRatings = appraisalDetails.ratings.map(r => ({
      ...r,
      newValue: r.originalValue,
      newWeightedScore: r.originalWeightedScore
    }));
    
    setAppraisalDetails({
      ...appraisalDetails,
      ratings: resetRatings,
      newTotalScore: appraisalDetails.totalScore,
      newWeightedTotalScore: appraisalDetails.weightedTotalScore
    });
  };

  // Save rating changes
  const saveRatingChanges = async () => {
    if (!appraisalDetails || !selectedDispute) return;
    
    try {
      setSavingRatings(true);
      
      // Check if any ratings actually changed
      const hasChanges = appraisalDetails.ratings.some(r => r.newValue !== r.originalValue);
      if (!hasChanges) {
        toast.info('No rating changes to save');
        return;
      }
      
      // Prepare updated ratings in the format expected by backend
      const updatedRatings = appraisalDetails.ratings.map(r => ({
        key: r.key,
        title: r.title,
        ratingValue: r.newValue,
        comments: r.comments,
        maxScore: r.maxScore
      }));
      
      const newRawTotal = appraisalDetails.newTotalScore || appraisalDetails.totalScore;
      const newWeightedTotal = appraisalDetails.newWeightedTotalScore || appraisalDetails.weightedTotalScore || 0;
      
      // Calculate new overall rating based on weighted average
      const totalWeight = appraisalDetails.ratings.reduce((sum, r) => sum + (r.weight || 100), 0);
      const weightedAverage = totalWeight > 0 ? (newWeightedTotal / totalWeight) * 100 : 0;
      
      // Determine overall rating label based on weighted average percentage
      let newOverallRating = '';
      if (weightedAverage >= 90) newOverallRating = 'Outstanding';
      else if (weightedAverage >= 80) newOverallRating = 'Exceeds Expectations';
      else if (weightedAverage >= 70) newOverallRating = 'Meets Expectations';
      else if (weightedAverage >= 60) newOverallRating = 'Needs Improvement';
      else newOverallRating = 'Unsatisfactory';
      
      console.log('💾 Saving rating changes:', {
        newRawTotal,
        newWeightedTotal,
        weightedAverage,
        newOverallRating,
        updatedRatings
      });
      
      // Update the appraisal record
      await api.patch(`/performance/records/${appraisalDetails._id}`, {
        ratings: updatedRatings,
        totalScore: newWeightedTotal, // Use weighted total for overall score
        overallRatingLabel: newOverallRating,
        updatedBy: currentUser?.employeeId
      });
      
      // Update local state
      setAppraisalDetails({
        ...appraisalDetails,
        totalScore: newRawTotal,
        weightedTotalScore: newWeightedTotal,
        overallRatingLabel: newOverallRating,
        ratings: appraisalDetails.ratings.map(r => ({
          ...r,
          originalValue: r.newValue,
          originalWeightedScore: r.newWeightedScore
        }))
      });
      
      toast.success('Rating changes saved successfully');
      
    } catch (error: any) {
      console.error('Failed to save rating changes:', error);
      toast.error(error.response?.data?.message || 'Failed to save rating changes');
    } finally {
      setSavingRatings(false);
    }
  };

  // Resolve dispute
  const resolveDispute = async () => {
    if (!selectedDispute || !currentUser?.employeeId) {
      toast.error('Missing required information');
      return;
    }
    
    if (!resolutionSummary.trim()) {
      toast.error('Please provide a resolution summary');
      return;
    }
    
    try {
      setResolving(true);
      
      // First save rating changes if any were made
      if (showRatingEditor && appraisalDetails) {
        await saveRatingChanges();
      }
      
      // Prepare resolution data
      const newWeightedTotal = appraisalDetails?.newWeightedTotalScore || appraisalDetails?.weightedTotalScore || 0;
      const newRawTotal = appraisalDetails?.newTotalScore || appraisalDetails?.totalScore || 0;
      
      const resolutionData = {
        status: decision,
        resolutionSummary: resolutionSummary.trim(),
        resolvedBy: currentUser.employeeId,
        updatedAppraisal: decision === AppraisalDisputeStatus.ADJUSTED && appraisalDetails ? {
          totalScore: newWeightedTotal, // Use weighted total
          overallRatingLabel: appraisalDetails.overallRatingLabel,
          ratings: appraisalDetails.ratings.map(r => ({
            key: r.key,
            title: r.title,
            ratingValue: r.newValue,
            comments: r.comments
          }))
        } : undefined
      };
      
      console.log('🎯 Resolution data:', resolutionData);
      
      // Resolve the dispute
      await api.patch(`/performance/disputes/${selectedDispute._id}/resolve`, resolutionData);
      
      toast.success(`Dispute ${decision.toLowerCase()} successfully`);
      
      // Reset and reload
      setSelectedDispute(null);
      setAppraisalDetails(null);
      setShowRatingEditor(false);
      setResolutionSummary('');
      loadDisputes();
      
    } catch (error: any) {
      console.error('Failed to resolve dispute:', error);
      toast.error(error.response?.data?.message || 'Failed to resolve dispute');
    } finally {
      setResolving(false);
    }
  };

  // Filter disputes based on active tab
  const filteredDisputes = disputes.filter(dispute => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') {
      return dispute.status === AppraisalDisputeStatus.OPEN || 
             dispute.status === AppraisalDisputeStatus.UNDER_REVIEW;
    }
    if (activeTab === 'resolved') {
      return dispute.status === AppraisalDisputeStatus.ADJUSTED || 
             dispute.status === AppraisalDisputeStatus.REJECTED;
    }
    return true;
  });

  // Calculate statistics
  const stats = {
    total: disputes.length,
    pending: disputes.filter(d => 
      d.status === AppraisalDisputeStatus.OPEN || 
      d.status === AppraisalDisputeStatus.UNDER_REVIEW
    ).length,
    resolved: disputes.filter(d => 
      d.status === AppraisalDisputeStatus.ADJUSTED || 
      d.status === AppraisalDisputeStatus.REJECTED
    ).length,
    open: disputes.filter(d => d.status === AppraisalDisputeStatus.OPEN).length,
    underReview: disputes.filter(d => d.status === AppraisalDisputeStatus.UNDER_REVIEW).length,
  };

  return (
    <AppShell title="Appraisal Disputes" allowedRoles={['HR Manager', 'HR Admin', 'System Admin']}>
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Disputes</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="p-2 rounded-full bg-blue-100">
                  <div className="h-5 w-5 text-blue-600">📊</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <div className="p-2 rounded-full bg-amber-100">
                  <div className="h-5 w-5 text-amber-600">⏳</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Open</p>
                  <p className="text-2xl font-bold">{stats.open}</p>
                </div>
                <div className="p-2 rounded-full bg-red-100">
                  <div className="h-5 w-5 text-red-600">⚠️</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Resolved</p>
                  <p className="text-2xl font-bold">{stats.resolved}</p>
                </div>
                <div className="p-2 rounded-full bg-green-100">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Manage Appraisal Disputes</CardTitle>
                <CardDescription>
                  Review and resolve employee disputes about their performance appraisals
                </CardDescription>
              </div>
              <Button 
                onClick={loadDisputes} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="all">
                  All Disputes ({stats.total})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({stats.pending})
                </TabsTrigger>
                <TabsTrigger value="resolved">
                  Resolved ({stats.resolved})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredDisputes.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg">
                    <div className="h-12 w-12 mx-auto text-gray-300 mb-3">⚖️</div>
                    <p className="text-gray-500">No disputes found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {activeTab === 'pending' 
                        ? 'No pending disputes at the moment' 
                        : 'No disputes match the current filter'}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Employee</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Resolved</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDisputes.map((dispute) => (
                          <TableRow key={dispute._id}>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={`flex items-center gap-1 ${statusBadge(dispute.status)}`}
                              >
                                {getStatusIcon(dispute.status)}
                                {dispute.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {dispute.raisedByEmployeeId?.firstName || 'Unknown'} {dispute.raisedByEmployeeId?.lastName || ''}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {dispute.raisedByEmployeeId?.employeeNumber || 'N/A'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-md">
                              <p className="truncate">{dispute.reason}</p>
                              {dispute.details && (
                                <p className="text-xs text-gray-500 truncate">{dispute.details}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">
                                {new Date(dispute.submittedAt).toLocaleDateString()}
                              </p>
                            </TableCell>
                            <TableCell>
                              {dispute.resolvedAt ? (
                                <p className="text-sm">
                                  {new Date(dispute.resolvedAt).toLocaleDateString()}
                                </p>
                              ) : (
                                <span className="text-gray-400 text-sm">Pending</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                size="sm" 
                                onClick={() => handleSelectDispute(dispute)}
                                disabled={dispute.status === AppraisalDisputeStatus.ADJUSTED || 
                                         dispute.status === AppraisalDisputeStatus.REJECTED}
                              >
                                {dispute.status === AppraisalDisputeStatus.OPEN || 
                                 dispute.status === AppraisalDisputeStatus.UNDER_REVIEW
                                  ? 'Review' 
                                  : 'View'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Dispute Resolution Dialog */}
      {selectedDispute && (
        <Dialog open onOpenChange={() => {
          setSelectedDispute(null);
          setAppraisalDetails(null);
          setShowRatingEditor(false);
          setResolutionSummary('');
        }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Dispute Resolution</DialogTitle>
              <DialogDescription>
                Review and resolve dispute for {selectedDispute.raisedByEmployeeId?.firstName || 'Unknown'} {selectedDispute.raisedByEmployeeId?.lastName || ''}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Dispute Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-medium">Employee Information</Label>
                    <div className="text-sm">
                      <p><span className="font-medium">Name:</span> {selectedDispute.raisedByEmployeeId?.firstName || 'Unknown'} {selectedDispute.raisedByEmployeeId?.lastName || ''}</p>
                      <p><span className="font-medium">Employee ID:</span> {selectedDispute.raisedByEmployeeId?.employeeNumber || 'N/A'}</p>
                      <p><span className="font-medium">Email:</span> {selectedDispute.raisedByEmployeeId?.workEmail || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="font-medium">Dispute Details</Label>
                    <div className="text-sm">
                      <p><span className="font-medium">Status:</span> 
                        <Badge variant="outline" className={`ml-2 ${statusBadge(selectedDispute.status)}`}>
                          {selectedDispute.status}
                        </Badge>
                      </p>
                      <p><span className="font-medium">Submitted:</span> {new Date(selectedDispute.submittedAt).toLocaleDateString()}</p>
                      {selectedDispute.cycleId?.name && (
                        <p><span className="font-medium">Cycle:</span> {selectedDispute.cycleId.name}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Dispute Reason</Label>
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-sm">{selectedDispute.reason}</p>
                  </div>
                </div>

                {selectedDispute.details && (
                  <div className="space-y-2">
                    <Label className="font-medium">Additional Details</Label>
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <p className="text-sm">{selectedDispute.details}</p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Template Information */}
              {appraisalDetails?.templateName && (
                <div className="space-y-2">
                  <Label className="font-medium">Template Information</Label>
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <div className="space-y-1">
                        <p><strong>Template:</strong> {appraisalDetails.templateName}</p>
                        {appraisalDetails.ratingScale && (
                          <p>
                            <strong>Rating Scale:</strong> {appraisalDetails.ratingScale.min} to {appraisalDetails.ratingScale.max} 
                            ({appraisalDetails.ratingScale.type?.replace('_', ' ').toLowerCase() || 'standard'})
                          </p>
                        )}
                        {appraisalDetails.maxPossibleScore && (
                          <p><strong>Max Possible Score:</strong> {appraisalDetails.maxPossibleScore.toFixed(1)}</p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <Separator />

              {/* Appraisal Ratings Editor */}
              {appraisalDetails && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Label className="font-medium text-lg">Appraisal Ratings</Label>
                        {appraisalDetails.templateName && (
                          <Badge variant="outline" className="text-xs">
                            {appraisalDetails.templateName}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          <span className="font-medium">Raw Score:</span> {appraisalDetails.totalScore.toFixed(1)} / {appraisalDetails.maxPossibleScore?.toFixed(1) || 'N/A'}
                          {appraisalDetails.newTotalScore !== undefined && appraisalDetails.newTotalScore !== appraisalDetails.totalScore && (
                            <span className="ml-2 text-green-600">
                              → {appraisalDetails.newTotalScore.toFixed(1)}
                            </span>
                          )}
                        </p>
                        <p>
                          <span className="font-medium">Weighted Score:</span> {appraisalDetails.weightedTotalScore?.toFixed(1) || '0.0'}
                          {appraisalDetails.newWeightedTotalScore !== undefined && appraisalDetails.newWeightedTotalScore !== appraisalDetails.weightedTotalScore && (
                            <span className="ml-2 text-green-600">
                              → {appraisalDetails.newWeightedTotalScore.toFixed(1)}
                            </span>
                          )}
                        </p>
                        <p className="font-medium text-blue-600">
                          Overall Rating: {appraisalDetails.overallRatingLabel}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {showRatingEditor && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={resetRatings}
                          disabled={savingRatings}
                        >
                          <Undo className="h-3 w-3 mr-1" />
                          Reset
                        </Button>
                      )}
                      
                      <Button
                        type="button"
                        size="sm"
                        variant={showRatingEditor ? "default" : "outline"}
                        onClick={() => setShowRatingEditor(!showRatingEditor)}
                        disabled={savingRatings || decision === AppraisalDisputeStatus.REJECTED}
                      >
                        {showRatingEditor ? (
                          <>
                            <Save className="h-3 w-3 mr-1" />
                            Save Changes
                          </>
                        ) : (
                          <>
                            <Edit className="h-3 w-3 mr-1" />
                            Edit Ratings
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {showRatingEditor ? (
                    <div className="space-y-4">
                      <Alert className="bg-blue-50 border-blue-200">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription>
                          <p className="font-medium text-blue-800 mb-1">Editing Ratings</p>
                          <p className="text-sm">You can adjust individual ratings. Changes will be saved to the employee's appraisal record.</p>
                          <p className="text-sm mt-1">Scores are weighted according to the template criteria.</p>
                        </AlertDescription>
                      </Alert>
                      
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-2/5">Criteria</TableHead>
                              <TableHead className="w-1/5">Original</TableHead>
                              <TableHead className="w-1/5">New Rating</TableHead>
                              <TableHead className="w-1/5">Score Impact</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {appraisalDetails.ratings.map((rating, index) => (
                              <TableRow key={rating.key}>
                                <TableCell>
                                  <div>
                                    <div className="flex items-center gap-1">
                                      <p className="font-medium">{rating.title}</p>
                                      {rating.required && (
                                        <span className="text-xs text-red-500">*</span>
                                      )}
                                      {rating.weight && rating.weight !== 100 && (
                                        <Badge variant="secondary" className="text-xs ml-2">
                                          {rating.weight}%
                                        </Badge>
                                      )}
                                    </div>
                                    {rating.templateDetails && (
                                      <p className="text-xs text-gray-500 mt-1">{rating.templateDetails}</p>
                                    )}
                                    {rating.comments && (
                                      <p className="text-xs text-muted-foreground mt-1">{rating.comments}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                      <span>Max: {rating.maxScore || 5}</span>
                                      {rating.weight !== undefined && rating.weight !== 100 && (
                                        <span>• Weight: {rating.weight}%</span>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <Badge variant="outline">{rating.originalValue.toFixed(1)}</Badge>
                                    {rating.weight && rating.weight !== 100 && (
                                      <p className="text-xs text-gray-500">
                                        Weighted: {rating.originalWeightedScore?.toFixed(1) || '0.0'}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        min={appraisalDetails.ratingScale?.min || 0}
                                        max={rating.maxScore || appraisalDetails.ratingScale?.max || 5}
                                        step={appraisalDetails.ratingScale?.step || 0.5}
                                        value={rating.newValue}
// In the input field, update the onChange handler:
onChange={(e) => updateRating(index, e.target.value)}
                                        className="w-24"
                                        disabled={savingRatings}
                                      />
                                      <span className="text-sm text-muted-foreground">
                                        {rating.newValue !== rating.originalValue && (
                                          <span className={rating.newValue > rating.originalValue ? "text-green-600" : "text-red-600"}>
                                            {rating.newValue > rating.originalValue ? '↑' : '↓'}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                    {rating.weight && rating.weight !== 100 && rating.newWeightedScore !== undefined && (
                                      <p className="text-xs text-gray-500">
                                        Weighted: {rating.newWeightedScore.toFixed(1)}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    {rating.newValue !== rating.originalValue && (
                                      <>
                                        <Badge 
                                          variant={rating.newValue > rating.originalValue ? "default" : "destructive"}
                                          className="text-xs"
                                        >
                                          {rating.newValue > rating.originalValue ? '+' : ''}
                                          {(rating.newValue - rating.originalValue).toFixed(1)}
                                        </Badge>
                                        {rating.weight && rating.weight !== 100 && (
                                          <p className="text-xs text-gray-500">
                                            Impact: {rating.newWeightedScore && rating.originalWeightedScore ? 
                                              `+${(rating.newWeightedScore - rating.originalWeightedScore).toFixed(1)}` : '0.0'}
                                          </p>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>

                      {(appraisalDetails.newTotalScore !== undefined && appraisalDetails.newTotalScore !== appraisalDetails.totalScore) ||
                       (appraisalDetails.newWeightedTotalScore !== undefined && appraisalDetails.newWeightedTotalScore !== appraisalDetails.weightedTotalScore) ? (
                        <Alert className="bg-green-50 border-green-200">
                          <AlertCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            <div className="space-y-1">
                              <p className="font-medium">Score Changes:</p>
                              {appraisalDetails.newTotalScore !== undefined && appraisalDetails.newTotalScore !== appraisalDetails.totalScore && (
                                <p>
                                  <span>Raw Score:</span> {appraisalDetails.totalScore.toFixed(1)} → {appraisalDetails.newTotalScore.toFixed(1)}
                                  <span className="ml-2 font-medium">
                                    ({appraisalDetails.newTotalScore > appraisalDetails.totalScore ? '+' : ''}
                                    {(appraisalDetails.newTotalScore - appraisalDetails.totalScore).toFixed(1)})
                                  </span>
                                </p>
                              )}
                              {appraisalDetails.newWeightedTotalScore !== undefined && appraisalDetails.newWeightedTotalScore !== appraisalDetails.weightedTotalScore && (
                                <p>
                                  <span>Weighted Score:</span> {appraisalDetails.weightedTotalScore?.toFixed(1) || '0.0'} → {appraisalDetails.newWeightedTotalScore.toFixed(1)}
                                  <span className="ml-2 font-medium">
                                    ({appraisalDetails.newWeightedTotalScore > appraisalDetails.weightedTotalScore! ? '+' : ''}
                                    {(appraisalDetails.newWeightedTotalScore - (appraisalDetails.weightedTotalScore || 0)).toFixed(1)})
                                  </span>
                                </p>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          <p className="text-sm font-medium">Raw Score</p>
                          <p className="text-2xl font-bold">{appraisalDetails.totalScore.toFixed(1)}</p>
                          <p className="text-xs text-gray-500">out of {appraisalDetails.maxPossibleScore?.toFixed(1) || 'N/A'}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          <p className="text-sm font-medium">Weighted Score</p>
                          <p className="text-2xl font-bold">{appraisalDetails.weightedTotalScore?.toFixed(1) || '0.0'}</p>
                          <p className="text-xs text-gray-500">calculated with weights</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm font-medium">Overall Rating</p>
                          <p className="text-xl font-bold text-blue-700">{appraisalDetails.overallRatingLabel}</p>
                          <p className="text-xs text-gray-500">based on weighted average</p>
                        </div>
                      </div>
                      
                      {appraisalDetails.managerSummary && (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          <p className="text-sm font-medium mb-1">Manager Summary</p>
                          <p className="text-sm">{appraisalDetails.managerSummary}</p>
                        </div>
                      )}
                      
                      {appraisalDetails.strengths && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-sm font-medium mb-1 text-green-700">Strengths</p>
                          <p className="text-sm text-green-800">{appraisalDetails.strengths}</p>
                        </div>
                      )}
                      
                      {appraisalDetails.improvementAreas && (
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <p className="text-sm font-medium mb-1 text-amber-700">Areas for Improvement</p>
                          <p className="text-sm text-amber-800">{appraisalDetails.improvementAreas}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Resolution Section */}
              <div className="space-y-4">
                <div>
                  <Label className="font-medium">Decision *</Label>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      type="button" 
                      size="sm" 
                      variant={decision === AppraisalDisputeStatus.ADJUSTED ? "default" : "outline"} 
                      onClick={() => setDecision(AppraisalDisputeStatus.ADJUSTED)}
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-1" /> 
                      Adjust Ratings
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant={decision === AppraisalDisputeStatus.REJECTED ? "default" : "outline"} 
                      onClick={() => {
                        setDecision(AppraisalDisputeStatus.REJECTED);
                        setShowRatingEditor(false);
                      }}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-1" /> 
                      Reject Dispute
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="font-medium">Resolution Summary *</Label>
                  <Textarea 
                    rows={4} 
                    value={resolutionSummary} 
                    onChange={(e) => setResolutionSummary(e.target.value)} 
                    placeholder="Explain the resolution to the employee. Include any rating adjustments made and the reason for the decision."
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This summary will be visible to the employee and recorded in the dispute history.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedDispute(null);
                    setAppraisalDetails(null);
                    setShowRatingEditor(false);
                    setResolutionSummary('');
                  }}
                  disabled={resolving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={resolveDispute}
                  disabled={resolving || !resolutionSummary.trim()}
                  className="gap-2"
                >
                  {resolving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {decision === AppraisalDisputeStatus.ADJUSTED ? 'Adjust & Resolve' : 'Reject Dispute'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
  );
}