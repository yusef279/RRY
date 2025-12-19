'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { AppraisalAssignmentStatus } from '@/types/performance';
import { useUser } from '@/lib/user';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Add proper error types
interface ApiError {
  response?: {
    status: number;
    data?: any;
  };
  message: string;
}

type Assignment = {
  _id: string;
  cycleId: string;
  cycleName: string;
  template: {
    _id: string;
    name: string;
    criteria: {
      key: string;
      title: string;
      details: string;
      weight: number;
      maxScore: number;
      required: boolean;
    }[];
    ratingScale?: {
      type: string;
      min: number;
      max: number;
      step: number;
      labels: string[];
    };
    description?: string;
    instructions?: string;
  };
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    profilePictureUrl?: string;
    departmentName?: string;
    positionTitle?: string;
  };
  departmentId: string;
  status: AppraisalAssignmentStatus;
  submittedAt?: string;
  submittedBy?: string;
  answers?: Record<string, any>;
};

export default function ConductAppraisalsPage() {
  const user = useUser();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* 1️⃣ LOAD ASSIGNMENTS --------------------------------------------------- */
  useEffect(() => {
    if (!user?.employeeId) {
      console.log('No user ID found, skipping assignment fetch');
      return;
    }

    const fetchAssignments = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('🔄 Fetching assignments for manager...');
        const response = await api.get('/performance/assignments/manager/my');
        console.log('✅ Assignments response:', response.data);
        
        // Transform the backend response to match our frontend type
        const processedAssignments: Assignment[] = (response.data || []).map((assignment: any) => {
          // Extract employee data
          const employee = assignment.employeeProfileId;
          const employeeData = {
            _id: employee?._id || '',
            firstName: employee?.firstName || '',
            lastName: employee?.lastName || '',
            employeeNumber: employee?.employeeNumber || '',
            profilePictureUrl: employee?.profilePictureUrl,
            departmentName: employee?.departmentName || employee?.departmentId?.name,
            positionTitle: employee?.positionTitle || employee?.positionId?.title
          };
          
          // Extract template data - using criteria instead of sections
          const template = assignment.templateId;
          console.log('📄 Raw template data:', template);
          
          const templateData = {
            _id: template?._id || '',
            name: template?.name || 'Untitled Template',
            description: template?.description,
            instructions: template?.instructions,
            ratingScale: template?.ratingScale,
            criteria: template?.criteria || []
          };
          
          // Extract cycle name
          let cycleName = assignment.cycleName;
          if (!cycleName && assignment.cycleId && typeof assignment.cycleId === 'object') {
            cycleName = assignment.cycleId.name || assignment.cycleId.cycleName || 'Unknown Cycle';
          }
          
          return {
            _id: assignment._id,
            cycleId: assignment.cycleId?._id || assignment.cycleId || '',
            cycleName: cycleName || 'Unknown Cycle',
            template: templateData,
            employee: employeeData,
            departmentId: assignment.departmentId?._id || assignment.departmentId || '',
            status: assignment.status,
            submittedAt: assignment.submittedAt,
            submittedBy: assignment.submittedBy,
            answers: assignment.answers || {}
          };
        });
        
        console.log('📊 Processed assignments:', processedAssignments);
        setAssignments(processedAssignments);
        
      } catch (err: any) {
        const apiError = err as ApiError;
        console.error('❌ Error fetching assignments:', apiError);
        
        if (apiError.response?.status === 403) {
          toast.error('Access denied: You do not have permission to view these assignments');
          setError('You do not have permission to access appraisal assignments. Please contact your administrator.');
        } else if (apiError.response?.status === 404) {
          setError('No appraisal assignments found for your department.');
        } else {
          toast.error('Could not load appraisal assignments');
          setError('Failed to load assignments. Please try again later.');
        }
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [user?.employeeId]);

  /* 2. When user clicks an assignment */
  const openAssignment = useCallback((a: Assignment) => {
    console.log('Opening assignment:', a._id);
    console.log('Assignment template:', a.template);
    console.log('Template criteria:', a.template?.criteria);
    console.log('Current answers:', a.answers);
    
    setSelectedId(a._id);
    
    // Try to load any locally saved draft first
    const localDraft = localStorage.getItem(`appraisal_draft_${a._id}`);
    if (localDraft) {
      try {
        const parsed = JSON.parse(localDraft);
        console.log('📂 Loading local draft:', parsed);
        setDraft(parsed.answers || {});
        return;
      } catch (err) {
        console.error('Failed to parse local draft:', err);
      }
    }
    
    // Transform answers from array format to our draft format if needed
    if (a.answers && Array.isArray(a.answers.ratings)) {
      // Convert from RatingEntryDto[] format to our key-value format
      const transformedDraft: Record<string, any> = {};
      a.answers.ratings.forEach((rating: any) => {
        if (rating.key) {
          transformedDraft[rating.key] = rating.ratingValue;
          if (rating.comments) {
            transformedDraft[`${rating.key}_comments`] = rating.comments;
          }
        }
      });
      if (a.answers.overallComments || a.answers.overall_comments) {
        transformedDraft['overall_comments'] = a.answers.overallComments || a.answers.overall_comments;
      }
      setDraft(transformedDraft);
    } else {
      setDraft(a.answers || {});
    }
  }, []);

  /* 3. Transform draft data to RatingEntryDto[] format */
  const transformDraftToRatings = (selected: Assignment) => {
    if (!selected || !selected.template) return [];
    
    const ratings = selected.template.criteria.map((criterion) => {
      const ratingValue = draft[criterion.key];
      const comments = draft[`${criterion.key}_comments`];
      
      // Calculate weighted score if weight is provided
      let weightedScore;
      if (criterion.weight && ratingValue !== undefined && ratingValue !== null && ratingValue !== '') {
        const maxScore = criterion.maxScore || 5;
        const normalizedScore = (Number(ratingValue) / maxScore) * 100;
        weightedScore = (normalizedScore * criterion.weight) / 100;
      }
      
      return {
        key: criterion.key,
        title: criterion.title,
        ratingValue: ratingValue ? Number(ratingValue) : 0,
        ratingLabel: getRatingLabel(Number(ratingValue), selected.template.ratingScale),
        weightedScore,
        comments: comments || ''
      };
    });
    
    // Add overall comments as a special rating entry
    const overallComments = draft['overall_comments'];
    if (overallComments) {
      ratings.push({
        key: 'overall_comments',
        title: 'Overall Comments',
        ratingValue: 0,
        ratingLabel: '',
        weightedScore: 0,
        comments: overallComments
      });
    }
    
    return ratings;
  };

  /* 4. Helper to get rating label from scale */
  const getRatingLabel = (value: number, ratingScale?: any): string => {
    if (!ratingScale?.labels || !Array.isArray(ratingScale.labels) || ratingScale.labels.length === 0) {
      return '';
    }
    
    const { min, max } = ratingScale;
    const range = max - min;
    
    if (range === 0) return ratingScale.labels[0] || '';
    
    const index = Math.round(((value - min) / range) * (ratingScale.labels.length - 1));
    
    return ratingScale.labels[Math.max(0, Math.min(index, ratingScale.labels.length - 1))] || '';
  };

  /* 5. Save draft - Store locally and try backend */
  const saveDraft = async () => {
    if (!selectedId) {
      toast.error('No assignment selected');
      return;
    }
    
    setSaving(true);
    try {
      console.log('💾 Saving draft for assignment:', selectedId);
      
      const selected = assignments.find((a) => a._id === selectedId);
      if (!selected) {
        toast.error('Assignment not found');
        return;
      }
      
      const ratings = transformDraftToRatings(selected);
      const answers = {
        ratings: ratings,
        overall_comments: draft['overall_comments'] || ''
      };
      
      console.log('📤 Draft data to save:', answers);
      
      // Always save locally first
      localStorage.setItem(`appraisal_draft_${selectedId}`, JSON.stringify({
        answers: draft,
        savedAt: new Date().toISOString()
      }));
      
      // Try to save to backend if endpoints exist
      try {
        // First try the new draft endpoint
        await api.patch(`/performance/assignments/${selectedId}/draft`, { answers });
        console.log('✅ Draft saved to backend via draft endpoint');
      } catch (draftErr: any) {
        console.log('⚠️ Draft endpoint failed:', draftErr.message);
        
        // Try the general update endpoint
        try {
          await api.patch(`/performance/assignments/${selectedId}`, { 
            status: AppraisalAssignmentStatus.IN_PROGRESS
          });
          console.log('✅ Assignment status updated to IN_PROGRESS');
        } catch (updateErr: any) {
          console.log('⚠️ Update endpoint also failed:', updateErr.message);
        }
      }
      
      // Update local state
      setAssignments((prev) =>
        prev.map((a) => (a._id === selectedId ? { 
          ...a, 
          status: AppraisalAssignmentStatus.IN_PROGRESS
        } : a))
      );
      
      toast.success('Draft saved successfully');
      
    } catch (err: any) {
      console.error('❌ Save draft error:', err);
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  /* 6. Submit - Try multiple endpoints */
  const submit = async () => {
    if (!selectedId) {
      toast.error('No assignment selected');
      return;
    }
    
    const selected = assignments.find((a) => a._id === selectedId);
    if (!selected) {
      toast.error('Assignment not found');
      return;
    }
    
    if (!user?.employeeId) {
      toast.error('User not authenticated');
      return;
    }
    
    setSaving(true);
    try {
      console.log('📤 Submitting appraisal for assignment:', selectedId);
      
      // Transform draft to the required format
      const ratings = transformDraftToRatings(selected);
      const answers = {
        ratings: ratings,
        overall_comments: draft['overall_comments'] || ''
      };
      
      console.log('📤 Submission data:', answers);
      
      // Clear local draft storage
      localStorage.removeItem(`appraisal_draft_${selectedId}`);
      
      // Try endpoints in order:
      // 1. New submit endpoint
      // 2. General update endpoint
      // 3. Records endpoint
      
      let success = false;
      let errorMessage = '';
      
      // Option 1: Try the new submit endpoint
      try {
        const response = await api.patch(`/performance/assignments/${selectedId}/submit`, { answers });
        console.log('✅ Submit via submit endpoint:', response.data);
        success = true;
      } catch (submitErr: any) {
        console.log('❌ Submit endpoint failed:', submitErr.message);
        errorMessage = submitErr.message;
        
        // Option 2: Try general update endpoint
        try {
          const updateResponse = await api.patch(`/performance/assignments/${selectedId}`, {
            status: AppraisalAssignmentStatus.SUBMITTED
          });
          console.log('✅ Submit via update endpoint:', updateResponse.data);
          
          // Also create a record
          try {
            const recordData = {
              assignmentId: selectedId,
              cycleId: selected.cycleId,
              templateId: selected.template._id,
              employeeProfileId: selected.employee._id,
              managerProfileId: user.employeeId,
              ratings: ratings
            };
            
            await api.post('/performance/records', recordData);
            console.log('✅ Record created successfully');
          } catch (recordErr) {
            console.log('⚠️ Record creation failed but assignment updated:', recordErr);
          }
          
          success = true;
        } catch (updateErr: any) {
          console.log('❌ Update endpoint failed:', updateErr.message);
          
          // Option 3: Try records endpoint directly
          try {
            const recordData = {
              assignmentId: selectedId,
              cycleId: selected.cycleId,
              templateId: selected.template._id,
              employeeProfileId: selected.employee._id,
              managerProfileId: user.employeeId,
              ratings: ratings
            };
            
            await api.post('/performance/records', recordData);
            console.log('✅ Submit via records endpoint');
            success = true;
          } catch (recordErr: any) {
            console.log('❌ Records endpoint failed:', recordErr.message);
            errorMessage = recordErr.message;
          }
        }
      }
      
      if (success) {
        // Update local state after successful submission
        setAssignments((prev) =>
          prev.map((a) =>
            a._id === selectedId
              ? { 
                  ...a, 
                  status: AppraisalAssignmentStatus.SUBMITTED, 
                  submittedAt: new Date().toISOString()
                }
              : a
          )
        );
        
        toast.success('Appraisal submitted successfully');
        setSelectedId(null);
      } else {
        throw new Error(`All submission methods failed: ${errorMessage}`);
      }
      
    } catch (err: any) {
      console.error('❌ Submit error:', err);
      
      // More specific error handling
      if (err.response?.status === 400) {
        const errorData = err.response.data;
        if (errorData.message) {
          toast.error(`Validation error: ${errorData.message}`);
        } else {
          toast.error('Invalid data. Please check all required fields.');
        }
      } else if (err.response?.status === 403) {
        toast.error('You do not have permission to submit this appraisal');
      } else if (err.response?.status === 404) {
        toast.error('Submit endpoint not found. Please contact administrator.');
      } else if (err.response?.status === 409) {
        toast.error('This appraisal has already been submitted');
      } else {
        toast.error('Failed to submit appraisal. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  /* 7. Validate answers before submit */
  const validateAnswers = () => {
    const selected = assignments.find((a) => a._id === selectedId);
    if (!selected || !selected.template) return true;
    
    const template = selected.template;
    
    // Check if all criteria have answers
    for (const criterion of template.criteria) {
      const answer = draft[criterion.key];
      
      if (criterion.required && (answer === undefined || answer === null || answer === '')) {
        toast.error(`Please provide a score for: ${criterion.title}`);
        return false;
      }
      
      if (answer !== undefined && answer !== null && answer !== '') {
        const numAnswer = Number(answer);
        if (isNaN(numAnswer)) {
          toast.error(`Invalid score for: ${criterion.title}`);
          return false;
        }
        
        if (criterion.maxScore && numAnswer > criterion.maxScore) {
          toast.error(`Score for "${criterion.title}" cannot exceed ${criterion.maxScore}`);
          return false;
        }
        
        if (numAnswer < 0) {
          toast.error(`Score for "${criterion.title}" cannot be negative`);
          return false;
        }
      }
    }
    
    return true;
  };

  /* 8. Handle submit with validation */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedId) {
      toast.error('Please select an assignment first');
      return;
    }
    
    // Validate answers
    if (!validateAnswers()) {
      return;
    }
    
    // Confirm submission
    const confirmed = window.confirm('Are you sure you want to submit this appraisal? You cannot edit it after submission.');
    if (!confirmed) {
      return;
    }
    
    await submit();
  };

  /* 9. Test the transformed data */
  const testTransformedData = () => {
    const selected = assignments.find((a) => a._id === selectedId);
    if (!selected) {
      toast.error('Select an assignment first');
      return;
    }
    
    const ratings = transformDraftToRatings(selected);
    console.log('📊 Transformed ratings data:', ratings);
    
    // Validate each rating entry
    const validationErrors: string[] = [];
    ratings.forEach((rating, index) => {
      if (typeof rating.key !== 'string' || !rating.key) {
        validationErrors.push(`Rating ${index + 1}: missing or invalid key`);
      }
      if (typeof rating.ratingValue !== 'number' || isNaN(rating.ratingValue)) {
        validationErrors.push(`Rating ${index + 1}: invalid ratingValue`);
      }
    });
    
    if (validationErrors.length > 0) {
      console.error('❌ Validation errors:', validationErrors);
      toast.error('Data validation failed. Check console.');
    } else {
      console.log('✅ Data validation passed');
      toast.info('Check console for transformed data structure');
    }
  };

  /* 10. Load local drafts on mount */
  useEffect(() => {
    if (assignments.length > 0 && selectedId) {
      // Check for local drafts
      const localDraft = localStorage.getItem(`appraisal_draft_${selectedId}`);
      if (localDraft) {
        try {
          const parsed = JSON.parse(localDraft);
          console.log('📂 Found local draft:', parsed);
          toast.info('Loaded local draft data');
        } catch (err) {
          console.error('Failed to parse local draft:', err);
        }
      }
    }
  }, [selectedId, assignments]);

  /* 11. Helpers */
  const selected = assignments.find((a) => a._id === selectedId);
  const isSubmitted = selected?.status === AppraisalAssignmentStatus.SUBMITTED;

  /* 12. Debug logging */
  useEffect(() => {
    if (selected) {
      console.log('🔍 Selected assignment:', selected);
      console.log('🔍 Selected template criteria:', selected.template?.criteria);
      console.log('🔍 Current draft:', draft);
    }
  }, [selected, draft]);

  /* 13. Loading Skeletons */
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Department assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AppShell title="Conduct appraisals" allowedRoles={['Department Head']}>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Debug buttons (remove in production) */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={testTransformedData}
          className="text-xs"
        >
          Test Data Transformation
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            console.log('🧪 Current assignments:', assignments);
            console.log('🧪 Current draft:', draft);
            console.log('🧪 Selected assignment:', selected);
            toast.info('Check console for debug info');
          }}
          className="text-xs"
        >
          Debug Info
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: list */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Department assignments</CardTitle>
              {assignments.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} found
                </p>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => {
                    const isSelected = selectedId === a._id;
                    const hasLocalDraft = localStorage.getItem(`appraisal_draft_${a._id}`);
                    
                    return (
                      <TableRow
                        key={a._id}
                        className={`cursor-pointer hover:bg-muted/50 ${
                          isSelected ? 'bg-muted' : ''
                        }`}
                        onClick={() => openAssignment(a)}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{a.employee.firstName} {a.employee.lastName}</span>
                            {a.employee.positionTitle && (
                              <span className="text-xs text-muted-foreground">
                                {a.employee.positionTitle}
                              </span>
                            )}
                            {hasLocalDraft && (
                              <span className="text-xs text-amber-600 font-medium mt-1">
                                Has unsaved draft
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{a.cycleName}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              a.status === AppraisalAssignmentStatus.SUBMITTED
                                ? 'default'
                                : a.status === AppraisalAssignmentStatus.IN_PROGRESS
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {a.status === AppraisalAssignmentStatus.NOT_STARTED && 'Not Started'}
                            {a.status === AppraisalAssignmentStatus.IN_PROGRESS && 'In Progress'}
                            {a.status === AppraisalAssignmentStatus.SUBMITTED && 'Submitted'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {assignments.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                        {error ? (
                          'Unable to load assignments'
                        ) : (
                          'No appraisal assignments for your department at this time'
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Right: form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {selected ? (
                  `Appraising ${selected.employee.firstName} ${selected.employee.lastName}`
                ) : (
                  'Select an assignment'
                )}
              </CardTitle>
              {selected && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Template: {selected.template.name}
                  </p>
                  {selected.template.description && (
                    <p className="text-xs text-muted-foreground">
                      {selected.template.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Cycle: {selected.cycleName}
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!selected ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground mb-4">
                    Choose an assignment from the left to start
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Click on any employee in the list to begin their appraisal
                  </p>
                </div>
              ) : !selected.template?.criteria || selected.template.criteria.length === 0 ? (
                <div className="text-center py-10">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No appraisal criteria found in template. Please contact your administrator.
                    </AlertDescription>
                  </Alert>
                  <p className="text-sm text-muted-foreground mt-4">
                    The template "{selected.template.name}" has no criteria defined.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  {/* Template instructions */}
                  {selected.template.instructions && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        {selected.template.instructions}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Rating scale info */}
                  {selected.template.ratingScale && (
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Rating Scale</h4>
                      <p className="text-sm text-muted-foreground">
                        {selected.template.ratingScale.type === 'FIVE_POINT' && '5-point scale: '}
                        {selected.template.ratingScale.min} to {selected.template.ratingScale.max} 
                        (step: {selected.template.ratingScale.step})
                        {selected.template.ratingScale.labels?.length > 0 && (
                          <div className="mt-1">
                            <span className="text-xs">Labels: </span>
                            {selected.template.ratingScale.labels.join(', ')}
                          </div>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Criteria sections */}
                  {selected.template.criteria.map((criterion, index) => (
                    <div key={criterion.key || `criterion-${index}`} className="border rounded-lg p-4 bg-card">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{criterion.title}</h3>
                          {criterion.details && (
                            <p className="text-sm text-muted-foreground mt-1">{criterion.details}</p>
                          )}
                        </div>
                        <div className="text-right">
                          {criterion.weight && (
                            <Badge variant="outline" className="ml-2">
                              Weight: {criterion.weight}%
                            </Badge>
                          )}
                          {criterion.required && (
                            <Badge variant="destructive" className="ml-2">
                              Required
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="mb-2 block">
                          Score
                          <span className="text-sm text-muted-foreground ml-2">
                            (Max score: {criterion.maxScore || 5})
                          </span>
                          {criterion.required && (
                            <span className="text-sm text-red-500 ml-2">*</span>
                          )}
                        </Label>
                        
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={selected.template.ratingScale?.min || 0}
                            max={criterion.maxScore || selected.template.ratingScale?.max || 5}
                            step={selected.template.ratingScale?.step || 1}
                            disabled={isSubmitted || saving}
                            value={draft[criterion.key] ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? '' : Number(e.target.value);
                              setDraft((d) => ({ ...d, [criterion.key]: value }));
                            }}
                            className="w-32"
                            placeholder={`${selected.template.ratingScale?.min || 0}-${criterion.maxScore || selected.template.ratingScale?.max || 5}`}
                            required={criterion.required}
                          />
                          <span className="text-sm text-muted-foreground">
                            / {criterion.maxScore || selected.template.ratingScale?.max || 5}
                          </span>
                        </div>
                        
                        {/* Feedback/comment field */}
                        <div className="mt-4">
                          <Label className="mb-2 block">
                            Comments/Feedback
                            {criterion.required && (
                              <span className="text-sm text-red-500 ml-2">*</span>
                            )}
                          </Label>
                          <Textarea
                            disabled={isSubmitted || saving}
                            value={draft[`${criterion.key}_comments`] ?? ''}
                            onChange={(e) => {
                              setDraft((d) => ({ ...d, [`${criterion.key}_comments`]: e.target.value }));
                            }}
                            rows={3}
                            placeholder="Enter comments or feedback for this criterion..."
                            required={criterion.required}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Overall comments */}
                  <div className="border rounded-lg p-4 bg-card">
                    <h3 className="font-semibold text-lg mb-4">Overall Comments</h3>
                    <Textarea
                      disabled={isSubmitted || saving}
                      value={draft['overall_comments'] ?? ''}
                      onChange={(e) => {
                        setDraft((d) => ({ ...d, ['overall_comments']: e.target.value }));
                      }}
                      rows={4}
                      placeholder="Enter overall comments about the employee's performance..."
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    {!isSubmitted && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={saveDraft}
                          disabled={saving}
                        >
                          {saving ? 'Saving…' : 'Save draft'}
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={saving}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {saving ? 'Submitting…' : 'Submit appraisal'}
                        </Button>
                      </>
                    )}
                    {isSubmitted && (
                      <div className="flex items-center gap-2 ml-auto">
                        <Badge variant="default" className="px-3 py-1">
                          Submitted
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {selected.submittedAt && (
                            `on ${new Date(selected.submittedAt).toLocaleDateString()}`
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}