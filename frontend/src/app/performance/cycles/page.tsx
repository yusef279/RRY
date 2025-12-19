'use client';
import { useEffect, useState } from 'react';
import { Plus, Play, X, Send, Calendar, Info, Users, FileText, ChevronRight, AlertCircle, Clock, CheckCircle, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { AppraisalCycleStatus, AppraisalTemplateType } from '@/types/performance';
import { cn } from '@/lib/utils';

// Types
type Cycle = {
  _id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: AppraisalCycleStatus;
  cycleType: AppraisalTemplateType;
  templateAssignments?: TemplateAssignment[];
  managerDueDate?: string;
  employeeAcknowledgementDueDate?: string;
  canActivate?: boolean;
};

type TemplateAssignment = {
  _id?: string;
  templateId: string;
  templateName: string;
  templateType: AppraisalTemplateType;
  departmentIds: string[];
  departmentNames: string[];
  departmentStatus?: DepartmentCycleStatus[];
};

type DepartmentCycleStatus = {
  departmentId: string;
  departmentName: string;
  hasActiveCycle: boolean;
  activeCycleName?: string;
  activeCycleEndDate?: string;
};

type Template = {
  _id: string;
  name: string;
  templateType: AppraisalTemplateType;
  description?: string;
  applicableDepartmentIds?: string[];
  applicablePositionIds?: string[];
};

type Department = {
  _id: string;
  name: string;
  code: string;
  employeeCount?: number;
  isApplicable?: boolean;
};

export default function CyclesPage() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    cycleType: AppraisalTemplateType.ANNUAL,
    managerDueDate: '',
    employeeAcknowledgementDueDate: '',
    templateAssignments: [] as TemplateAssignment[],
  });
  
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    cycleType: AppraisalTemplateType.ANNUAL,
    managerDueDate: '',
    employeeAcknowledgementDueDate: '',
    templateAssignments: [] as TemplateAssignment[],
  });
  
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  
  const [editSelectedTemplate, setEditSelectedTemplate] = useState('');
  const [editSelectedDepts, setEditSelectedDepts] = useState<string[]>([]);
  
  // New state for filtering
  const [showOnlyApplicable, setShowOnlyApplicable] = useState(false);
  const [editShowOnlyApplicable, setEditShowOnlyApplicable] = useState(false);

  const calculateDaysUntilEnd = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const loadCycles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/performance/cycles');
      const cyclesData: Cycle[] = Array.isArray(response.data) ? response.data : [];
      setCycles(cyclesData);
      return cyclesData;
    } catch (error) {
      toast.error('Failed to load cycles');
      console.error(error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadTemplatesAndDepartments = async () => {
    try {
      const [templatesRes, departmentsRes] = await Promise.all([
        api.get('/performance/templates'),
        api.get('/organization-structure/departments'),
      ]);
      
      // Load templates with applicability data
      const templatesData: Template[] = Array.isArray(templatesRes.data) ? templatesRes.data : [];
      setTemplates(templatesData);
      
      // Load departments
      const departmentsData: Department[] = Array.isArray(departmentsRes.data) ? departmentsRes.data : [];
      setDepartments(departmentsData);
      
      return { templates: templatesData, departments: departmentsData };
    } catch (e) {
      console.error('Failed to load templates/departments', e);
      toast.error('Failed to load templates or departments');
      return { templates: [], departments: [] };
    }
  };

  // Function to get departments applicable to selected template
  const getApplicableDepartments = (templateId: string): Department[] => {
    const template = templates.find(t => t._id === templateId);
    if (!template) return [];
    
    // If template has no specific department restrictions, all departments are applicable
    if (!template.applicableDepartmentIds || template.applicableDepartmentIds.length === 0) {
      return departments.map(dept => ({ ...dept, isApplicable: true }));
    }
    
    // Only return departments that are in the template's applicable list
    return departments.map(dept => ({
      ...dept,
      isApplicable: template.applicableDepartmentIds?.includes(dept._id) || false
    }));
  };

  // Filter departments based on template selection and filter toggle
  const getFilteredDepartments = (templateId: string, showOnlyApplicableFlag: boolean) => {
    const applicableDepartments = getApplicableDepartments(templateId);
    
    if (!showOnlyApplicableFlag) {
      return applicableDepartments;
    }
    
    // Filter to show only applicable departments
    return applicableDepartments.filter(dept => dept.isApplicable);
  };

  const isDepartmentInActiveCycle = (departmentId: string): { inActive: boolean; activeCycleName?: string; activeCycleEndDate?: string } => {
    for (const cycle of cycles) {
      if (cycle.status === AppraisalCycleStatus.ACTIVE) {
        const hasAssignment = cycle.templateAssignments?.some(assignment => 
          assignment.departmentIds.includes(departmentId)
        );
        if (hasAssignment) {
          return { 
            inActive: true, 
            activeCycleName: cycle.name,
            activeCycleEndDate: cycle.endDate
          };
        }
      }
    }
    return { inActive: false };
  };

  const canCycleBeActivated = async (cycle: Cycle): Promise<boolean> => {
    if (cycle.status !== AppraisalCycleStatus.PLANNED) return false;
    if (!cycle.templateAssignments || cycle.templateAssignments.length === 0) return false;
    
    const allDepartmentIds = cycle.templateAssignments.flatMap(assignment => assignment.departmentIds);
    
    try {
      for (const deptId of allDepartmentIds) {
        const { inActive } = isDepartmentInActiveCycle(deptId);
        if (inActive) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to check cycle activation:', error);
      return false;
    }
  };

  const getDepartmentCycleStatus = (departmentIds: string[]): DepartmentCycleStatus[] => {
    return departmentIds.map(deptId => {
      const department = departments.find(d => d._id === deptId);
      const { inActive, activeCycleName, activeCycleEndDate } = isDepartmentInActiveCycle(deptId);
      
      return {
        departmentId: deptId,
        departmentName: department?.name || 'Unknown',
        hasActiveCycle: inActive,
        activeCycleName,
        activeCycleEndDate,
      };
    });
  };

  const addTemplateAssignment = () => {
    if (!selectedTemplate || selectedDepts.length === 0) {
      toast.error('Please select a template and at least one department');
      return;
    }

    const template = templates.find(t => t._id === selectedTemplate);
    if (!template) {
      toast.error('Selected template not found');
      return;
    }

    // Check if selected departments are applicable to the template
    const applicableDepartments = getApplicableDepartments(selectedTemplate);
    const inapplicableDepts = selectedDepts.filter(deptId => {
      const dept = applicableDepartments.find(d => d._id === deptId);
      return !dept?.isApplicable;
    });

    if (inapplicableDepts.length > 0) {
      const inapplicableNames = inapplicableDepts.map(deptId => 
        departments.find(d => d._id === deptId)?.name || 'Unknown'
      ).join(', ');
      
      toast.error(`The following departments are not applicable to this template: ${inapplicableNames}`);
      return;
    }

    const departmentNames = selectedDepts.map(deptId => 
      departments.find(dept => dept._id === deptId)?.name || 'Unknown'
    );

    const departmentStatuses = getDepartmentCycleStatus(selectedDepts);

    const newAssignment: TemplateAssignment = {
      templateId: selectedTemplate,
      templateName: template.name,
      templateType: template.templateType,
      departmentIds: [...selectedDepts],
      departmentNames: departmentNames,
      departmentStatus: departmentStatuses,
    };

    setForm({
      ...form,
      templateAssignments: [...form.templateAssignments, newAssignment],
    });
    
    setSelectedTemplate('');
    setSelectedDepts([]);
    setShowOnlyApplicable(false);
    toast.success('Template assignment added');
  };

  const addEditTemplateAssignment = () => {
    if (!editSelectedTemplate || editSelectedDepts.length === 0) {
      toast.error('Please select a template and at least one department');
      return;
    }

    const template = templates.find(t => t._id === editSelectedTemplate);
    if (!template) {
      toast.error('Selected template not found');
      return;
    }

    // Check if selected departments are applicable to the template
    const applicableDepartments = getApplicableDepartments(editSelectedTemplate);
    const inapplicableDepts = editSelectedDepts.filter(deptId => {
      const dept = applicableDepartments.find(d => d._id === deptId);
      return !dept?.isApplicable;
    });

    if (inapplicableDepts.length > 0) {
      const inapplicableNames = inapplicableDepts.map(deptId => 
        departments.find(d => d._id === deptId)?.name || 'Unknown'
      ).join(', ');
      
      toast.error(`The following departments are not applicable to this template: ${inapplicableNames}`);
      return;
    }

    const departmentNames = editSelectedDepts.map(deptId => 
      departments.find(dept => dept._id === deptId)?.name || 'Unknown'
    );

    const departmentStatuses = getDepartmentCycleStatus(editSelectedDepts);

    const newAssignment: TemplateAssignment = {
      templateId: editSelectedTemplate,
      templateName: template.name,
      templateType: template.templateType,
      departmentIds: [...editSelectedDepts],
      departmentNames: departmentNames,
      departmentStatus: departmentStatuses,
    };

    setEditForm({
      ...editForm,
      templateAssignments: [...editForm.templateAssignments, newAssignment],
    });
    
    setEditSelectedTemplate('');
    setEditSelectedDepts([]);
    setEditShowOnlyApplicable(false);
    toast.success('Template assignment added');
  };

  const removeTemplateAssignment = (index: number) => {
    const newAssignments = [...form.templateAssignments];
    newAssignments.splice(index, 1);
    setForm({
      ...form,
      templateAssignments: newAssignments,
    });
    toast.success('Template assignment removed');
  };

  const removeEditTemplateAssignment = (index: number) => {
    const newAssignments = [...editForm.templateAssignments];
    newAssignments.splice(index, 1);
    setEditForm({
      ...editForm,
      templateAssignments: newAssignments,
    });
    toast.success('Template assignment removed');
  };

  const createCycle = async () => {
    setError('');
    
    if (!form.name.trim()) {
      setError('Please enter a cycle name');
      return;
    }
    
    if (!form.startDate || !form.endDate) {
      setError('Please select start and end dates');
      return;
    }
    
    if (new Date(form.startDate) >= new Date(form.endDate)) {
      setError('End date must be after start date');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        cycleType: form.cycleType,
        managerDueDate: form.managerDueDate || undefined,
        employeeAcknowledgementDueDate: form.employeeAcknowledgementDueDate || undefined,
        templateAssignments: form.templateAssignments.map(assignment => ({
          templateId: assignment.templateId,
          departmentIds: assignment.departmentIds,
        })),
      };

      await api.post('/performance/cycles', payload);
      
      toast.success('Cycle created successfully');
      setOpen(false);
      
      setForm({ 
        name: '', 
        description: '',
        startDate: '', 
        endDate: '', 
        cycleType: AppraisalTemplateType.ANNUAL,
        managerDueDate: '',
        employeeAcknowledgementDueDate: '',
        templateAssignments: [],
      });
      setSelectedTemplate('');
      setSelectedDepts([]);
      setShowOnlyApplicable(false);
      
      await refreshAllData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create cycle';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateCycle = async () => {
    setError('');
    
    if (!editingCycle) return;

    try {
      setLoading(true);

      const payload = {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        cycleType: editForm.cycleType,
        managerDueDate: editForm.managerDueDate || undefined,
        employeeAcknowledgementDueDate: editForm.employeeAcknowledgementDueDate || undefined,
        templateAssignments: editForm.templateAssignments.map(assignment => ({
          templateId: assignment.templateId,
          departmentIds: assignment.departmentIds,
        })),
      };

      await api.put(`/performance/cycles/${editingCycle._id}`, payload);
      
      toast.success('Cycle updated successfully');
      setEditOpen(false);
      setEditingCycle(null);
      
      setEditForm({ 
        name: '', 
        description: '',
        startDate: '', 
        endDate: '', 
        cycleType: AppraisalTemplateType.ANNUAL,
        managerDueDate: '',
        employeeAcknowledgementDueDate: '',
        templateAssignments: [],
      });
      setEditSelectedTemplate('');
      setEditSelectedDepts([]);
      
      await refreshAllData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update cycle';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (cycle: Cycle) => {
    setEditingCycle(cycle);
    setEditForm({
      name: cycle.name,
      description: cycle.description || '',
      startDate: cycle.startDate.split('T')[0],
      endDate: cycle.endDate.split('T')[0],
      cycleType: cycle.cycleType,
      managerDueDate: cycle.managerDueDate ? cycle.managerDueDate.split('T')[0] : '',
      employeeAcknowledgementDueDate: cycle.employeeAcknowledgementDueDate ? cycle.employeeAcknowledgementDueDate.split('T')[0] : '',
      templateAssignments: cycle.templateAssignments?.map(assignment => ({
        templateId: assignment.templateId,
        templateName: assignment.templateName || templates.find(t => t._id === assignment.templateId)?.name || 'Unknown',
        templateType: assignment.templateType,
        departmentIds: assignment.departmentIds,
        departmentNames: assignment.departmentNames || assignment.departmentIds.map(deptId => 
          departments.find(d => d._id === deptId)?.name || 'Unknown'
        ),
        departmentStatus: getDepartmentCycleStatus(assignment.departmentIds),
      })) || [],
    });
    setEditSelectedTemplate('');
    setEditSelectedDepts([]);
    setError('');
    setEditOpen(true);
  };

  const activateCycle = async (id: string) => {
    try {
      const cycle = cycles.find(c => c._id === id);
      if (!cycle) return;
      
      const canActivate = await canCycleBeActivated(cycle);
      if (!canActivate) {
        toast.error('Cannot activate cycle. Some departments are still in other active cycles.');
        return;
      }

      await api.patch(`/performance/cycles/${id}/activate`);
      toast.success('Cycle activated successfully');
      await refreshAllData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to activate cycle';
      toast.error(errorMessage);
    }
  };

  const closeCycle = async (id: string) => {
    if (!confirm('Are you sure you want to close this cycle? This action cannot be undone.')) {
      return;
    }
    
    try {
      await api.patch(`/performance/cycles/${id}/close`);
      toast.success('Cycle closed successfully');
      await refreshAllData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to close cycle';
      toast.error(errorMessage);
    }
  };

  const sendReminders = async (id: string) => {
    try {
      await api.post(`/performance/cycles/${id}/reminders`);
      toast.success('Reminders sent successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send reminders';
      toast.error(errorMessage);
    }
  };

  const getStatusBadgeVariant = (status: AppraisalCycleStatus) => {
    switch (status) {
      case AppraisalCycleStatus.ACTIVE:
        return 'bg-green-500 hover:bg-green-600';
      case AppraisalCycleStatus.CLOSED:
        return 'bg-gray-500 hover:bg-gray-600';
      case AppraisalCycleStatus.PLANNED:
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-amber-500 hover:bg-amber-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCycleType = (type: AppraisalTemplateType) => {
    return type.replace('_', ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Refresh all data and update cycle activation status
  const refreshAllData = async () => {
    try {
      setLoading(true);
      
      // Load cycles first
      const cyclesData = await loadCycles();
      
      // Load templates and departments
      await loadTemplatesAndDepartments();
      
      // Update cycles with activation status
      if (cyclesData.length > 0) {
        const updatedCycles = await Promise.all(
          cyclesData.map(async (cycle) => ({
            ...cycle,
            canActivate: await canCycleBeActivated(cycle)
          }))
        );
        setCycles(updatedCycles);
      }
      
    } catch (error) {
      console.error('Failed to refresh data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  // Add this function to reset department selection when template changes
  useEffect(() => {
    if (selectedTemplate) {
      setSelectedDepts([]);
      setShowOnlyApplicable(false);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (editSelectedTemplate) {
      setEditSelectedDepts([]);
      setEditShowOnlyApplicable(false);
    }
  }, [editSelectedTemplate]);

  // Load data on mount
  useEffect(() => {
    refreshAllData();
  }, []);

  return (
    <AppShell
      title="Appraisal Cycles"
      allowedRoles={['HR Admin', 'HR Manager', 'HR Employee']}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Appraisal Cycles</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Create and manage performance appraisal cycles for your organization. 
                  Departments can be planned for future cycles while they're in active cycles.
                </p>
              </div>
              <Button 
                onClick={() => {
                  setForm({ 
                    name: '', 
                    description: '',
                    startDate: '', 
                    endDate: '', 
                    cycleType: AppraisalTemplateType.ANNUAL,
                    managerDueDate: '',
                    employeeAcknowledgementDueDate: '',
                    templateAssignments: [],
                  });
                  setError('');
                  setOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                New Cycle
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Cycles</p>
                  <p className="text-2xl font-bold">
                    {cycles.filter(c => c.status === AppraisalCycleStatus.ACTIVE).length}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <Play className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Planned Cycles</p>
                  <p className="text-2xl font-bold">
                    {cycles.filter(c => c.status === AppraisalCycleStatus.PLANNED).length}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Without Templates</p>
                  <p className="text-2xl font-bold">
                    {cycles.filter(c => c.status === AppraisalCycleStatus.PLANNED && 
                      (!c.templateAssignments || c.templateAssignments.length === 0)).length}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-amber-100">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Closed Cycles</p>
                  <p className="text-2xl font-bold">
                    {cycles.filter(c => c.status === AppraisalCycleStatus.CLOSED).length}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gray-100">
                  <X className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Cycles</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : cycles.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">No cycles found</h3>
                  <p className="text-muted-foreground">Create your first appraisal cycle to get started</p>
                </div>
                <Button onClick={() => setOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Cycle
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cycle Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Templates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cycles.map((cycle) => {
                      const hasNoTemplates = !cycle.templateAssignments || cycle.templateAssignments.length === 0;
                      
                      return (
                        <TableRow key={cycle._id} className="group">
                          <TableCell>
                            <div>
                              <p className="font-medium">{cycle.name}</p>
                              {cycle.description && (
                                <p className="text-sm text-muted-foreground line-clamp-1">{cycle.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {formatCycleType(cycle.cycleType)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="w-3 h-3" />
                                {formatDate(cycle.startDate)}
                              </div>
                              <ChevronRight className="w-4 h-4 mx-auto text-muted-foreground" />
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="w-3 h-3" />
                                {formatDate(cycle.endDate)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {hasNoTemplates ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  No Templates
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditDialog(cycle)}
                                  className="h-7 px-2"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span className="ml-1">Add</span>
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {cycle.templateAssignments?.slice(0, 2).map((assignment, idx) => (
                                  <Badge key={idx} variant="secondary" className="gap-1">
                                    <FileText className="w-3 h-3" />
                                    <span className="max-w-[100px] truncate">{assignment.templateName}</span>
                                  </Badge>
                                ))}
                                {cycle.templateAssignments && cycle.templateAssignments.length > 2 && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge variant="outline">+{cycle.templateAssignments.length - 2} more</Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="space-y-1">
                                          {cycle.templateAssignments.slice(2).map((assignment, idx) => (
                                            <div key={idx} className="text-sm">{assignment.templateName}</div>
                                          ))}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge className={cn("text-white", getStatusBadgeVariant(cycle.status))}>
                                {cycle.status}
                              </Badge>
                              {cycle.status === AppraisalCycleStatus.PLANNED && (
                                <div className="flex items-center gap-1">
                                  {cycle.canActivate ? (
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Ready
                                    </Badge>
                                  ) : hasNoTemplates ? (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      Needs Templates
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Waiting
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* For cycles without templates, show Add Templates button */}
                              {hasNoTemplates ? (
                                <Button
                                  size="sm"
                                  onClick={() => openEditDialog(cycle)}
                                  className="gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  Add Templates
                                </Button>
                              ) : (
                                // For cycles with templates, show regular action buttons
                                <>
                                  {cycle.status === AppraisalCycleStatus.PLANNED && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            onClick={() => activateCycle(cycle._id)}
                                            disabled={!cycle.canActivate}
                                            className={cn("gap-1", cycle.canActivate && "bg-emerald-600 hover:bg-emerald-700")}
                                          >
                                            <Play className="w-3 h-3" />
                                            Activate
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {!cycle.canActivate ? (
                                            <p>Some departments are still in other active cycles</p>
                                          ) : (
                                            <p>Activate this cycle</p>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  {cycle.status === AppraisalCycleStatus.ACTIVE && (
                                    <>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button 
                                              size="sm" 
                                              variant="outline"
                                              onClick={() => sendReminders(cycle._id)}
                                              className="gap-1"
                                            >
                                              <Send className="w-3 h-3" />
                                              Remind
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Send reminders to participants</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button 
                                              size="sm" 
                                              variant="destructive"
                                              onClick={() => closeCycle(cycle._id)}
                                              className="gap-1"
                                            >
                                              <X className="w-3 h-3" />
                                              Close
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Close this cycle</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create New Cycle Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Create New Appraisal Cycle</DialogTitle>
            <DialogDescription>
              Create a new performance appraisal cycle. Departments in active cycles can be planned for future cycles.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="templates">Template Assignments</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    Cycle Name *
                    <span className="text-xs text-muted-foreground">(e.g., Q1 2025 Performance Review)</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter cycle name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Optional description for this cycle"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Start Date *
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      End Date *
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="managerDueDate">Manager Due Date (Optional)</Label>
                    <Input
                      id="managerDueDate"
                      type="date"
                      value={form.managerDueDate}
                      onChange={(e) => setForm({ ...form, managerDueDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employeeAckDate">Employee Acknowledgement Due Date (Optional)</Label>
                    <Input
                      id="employeeAckDate"
                      type="date"
                      value={form.employeeAcknowledgementDueDate}
                      onChange={(e) => setForm({ ...form, employeeAcknowledgementDueDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cycleType">Cycle Type</Label>
                  <Select
                    value={form.cycleType}
                    onValueChange={(value) => setForm({ ...form, cycleType: value as AppraisalTemplateType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cycle type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AppraisalTemplateType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {formatCycleType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <div className="rounded-lg border p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Select Template
                  </Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template._id} value={template._id}>
                          <div className="flex flex-col">
                            <span>{template.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatCycleType(template.templateType)}
                              {template.applicableDepartmentIds && template.applicableDepartmentIds.length > 0 && (
                                <span className="ml-1">
                                  • {template.applicableDepartmentIds.length} applicable dept(s)
                                </span>
                              )}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Select Departments
                      <span className="text-xs text-muted-foreground">
                        ({selectedDepts.length} selected)
                      </span>
                    </Label>
                    {selectedTemplate && (
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <Label htmlFor="filter-applicable" className="text-sm cursor-pointer">
                          Show only applicable
                        </Label>
                        <Switch
                          id="filter-applicable"
                          checked={showOnlyApplicable}
                          onCheckedChange={setShowOnlyApplicable}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="border rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
                    {departments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        No departments available
                      </p>
                    ) : selectedTemplate ? (
                      (() => {
                        const filteredDepartments = getFilteredDepartments(selectedTemplate, showOnlyApplicable);
                        
                        if (filteredDepartments.length === 0) {
                          return (
                            <div className="text-center py-4">
                              <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                              <p className="text-amber-700 font-medium">No applicable departments</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                This template has department restrictions and none of the departments match.
                              </p>
                            </div>
                          );
                        }
                        
                        return filteredDepartments.map((dept) => {
                          const isSelected = selectedDepts.includes(dept._id);
                          const { inActive, activeCycleName, activeCycleEndDate } = isDepartmentInActiveCycle(dept._id);
                          const daysUntilEnd = activeCycleEndDate 
                            ? calculateDaysUntilEnd(activeCycleEndDate)
                            : null;
                          
                          return (
                            <label
                              key={dept._id}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors cursor-pointer",
                                isSelected && "bg-blue-50 border border-blue-200",
                                inActive && "border-l-4 border-l-amber-500",
                                !dept.isApplicable && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (!dept.isApplicable) return;
                                  
                                  if (e.target.checked) {
                                    setSelectedDepts([...selectedDepts, dept._id]);
                                  } else {
                                    setSelectedDepts(selectedDepts.filter(d => d !== dept._id));
                                  }
                                }}
                                disabled={!dept.isApplicable}
                                className={cn(
                                  "h-4 w-4 rounded border-input",
                                  !dept.isApplicable && "cursor-not-allowed"
                                )}
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "font-medium",
                                      !dept.isApplicable && "text-muted-foreground"
                                    )}>
                                      {dept.name}
                                    </span>
                                    {!dept.isApplicable && (
                                      <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                                        Not Applicable
                                      </Badge>
                                    )}
                                    {dept.isApplicable && (
                                      <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                                        Applicable
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {inActive && (
                                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Active: {activeCycleName}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <p className="text-xs text-muted-foreground">
                                    {dept.employeeCount || 0} employees • {dept.code}
                                  </p>
                                  {inActive && daysUntilEnd !== null && (
                                    <p className="text-xs text-amber-700">
                                      Ends in {daysUntilEnd} day{daysUntilEnd !== 1 ? 's' : ''}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </label>
                          );
                        });
                      })()
                    ) : (
                      <div className="text-center py-4">
                        <Info className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                        <p className="text-blue-700 font-medium">Select a template first</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Choose a template to see applicable departments
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={addTemplateAssignment}
                  disabled={!selectedTemplate || selectedDepts.length === 0}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Template Assignment
                </Button>

                <div className="text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    {selectedTemplate ? (
                      <>
                        Departments highlighted in <span className="font-medium text-green-700">green</span> are applicable to this template.
                        {showOnlyApplicable && " Showing only applicable departments."}
                      </>
                    ) : (
                      "Departments in active cycles can still be added. They will be planned for this cycle and can be activated when the current cycle closes."
                    )}
                  </p>
                </div>
              </div>

              {form.templateAssignments.length > 0 && (
                <div className="space-y-3">
                  <Label>Assigned Templates ({form.templateAssignments.length})</Label>
                  <div className="space-y-2">
                    {form.templateAssignments.map((assignment, index) => {
                      const activeDepts = assignment.departmentStatus?.filter(dept => dept.hasActiveCycle) || [];
                      const hasActiveDepts = activeDepts.length > 0;
                      
                      return (
                        <Card key={index} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-primary" />
                                  <span className="font-medium">{assignment.templateName}</span>
                                  <Badge variant="outline">
                                    {formatCycleType(assignment.templateType)}
                                  </Badge>
                                  {hasActiveDepts && (
                                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {activeDepts.length} dept{activeDepts.length !== 1 ? 's' : ''} in active cycles
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">Departments:</span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                                    {assignment.departmentStatus?.map((dept, idx) => (
                                      <div key={idx} className="text-sm">
                                        <div className="flex items-center gap-2">
                                          <span>{dept.departmentName}</span>
                                          {dept.hasActiveCycle ? (
                                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                              <Clock className="w-2 h-2 mr-1" />
                                              Active: {dept.activeCycleName}
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                              <CheckCircle className="w-2 h-2 mr-1" />
                                              Available
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeTemplateAssignment(index)}
                                className="ml-2"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {form.templateAssignments.length === 0 && (
                <div className="text-center py-8 space-y-3 border rounded-lg">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">No template assignments</p>
                    <p className="text-sm text-muted-foreground">
                      Add template assignments to activate this cycle
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={createCycle}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Cycle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Cycle Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Add Templates to: {editingCycle?.name}</DialogTitle>
            <DialogDescription>
              Add template assignments to this cycle. Cycle is currently {editingCycle?.status.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Select Template
                </Label>
                <Select value={editSelectedTemplate} onValueChange={setEditSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template._id} value={template._id}>
                        <div className="flex flex-col">
                          <span>{template.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatCycleType(template.templateType)}
                            {template.applicableDepartmentIds && template.applicableDepartmentIds.length > 0 && (
                              <span className="ml-1">
                                • {template.applicableDepartmentIds.length} applicable dept(s)
                              </span>
                            )}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Select Departments
                    <span className="text-xs text-muted-foreground">
                      ({editSelectedDepts.length} selected)
                    </span>
                  </Label>
                  {editSelectedTemplate && (
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="edit-filter-applicable" className="text-sm cursor-pointer">
                        Show only applicable
                      </Label>
                      <Switch
                        id="edit-filter-applicable"
                        checked={editShowOnlyApplicable}
                        onCheckedChange={setEditShowOnlyApplicable}
                      />
                    </div>
                  )}
                </div>
                
                <div className="border rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
                  {departments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No departments available
                    </p>
                  ) : editSelectedTemplate ? (
                    (() => {
                      const filteredDepartments = getFilteredDepartments(editSelectedTemplate, editShowOnlyApplicable);
                      
                      if (filteredDepartments.length === 0) {
                        return (
                          <div className="text-center py-4">
                            <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                            <p className="text-amber-700 font-medium">No applicable departments</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              This template has department restrictions and none of the departments match.
                            </p>
                          </div>
                        );
                      }
                      
                      return filteredDepartments.map((dept) => {
                        const isSelected = editSelectedDepts.includes(dept._id);
                        const { inActive, activeCycleName, activeCycleEndDate } = isDepartmentInActiveCycle(dept._id);
                        const daysUntilEnd = activeCycleEndDate 
                          ? calculateDaysUntilEnd(activeCycleEndDate)
                          : null;
                        
                        return (
                          <label
                            key={dept._id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors cursor-pointer",
                              isSelected && "bg-blue-50 border border-blue-200",
                              inActive && "border-l-4 border-l-amber-500",
                              !dept.isApplicable && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (!dept.isApplicable) return;
                                
                                if (e.target.checked) {
                                  setEditSelectedDepts([...editSelectedDepts, dept._id]);
                                } else {
                                  setEditSelectedDepts(editSelectedDepts.filter(d => d !== dept._id));
                                }
                              }}
                              disabled={!dept.isApplicable}
                              className={cn(
                                "h-4 w-4 rounded border-input",
                                !dept.isApplicable && "cursor-not-allowed"
                              )}
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "font-medium",
                                    !dept.isApplicable && "text-muted-foreground"
                                  )}>
                                    {dept.name}
                                  </span>
                                  {!dept.isApplicable && (
                                    <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                                      Not Applicable
                                    </Badge>
                                  )}
                                  {dept.isApplicable && (
                                    <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                                      Applicable
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {inActive && (
                                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Active: {activeCycleName}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {dept.employeeCount || 0} employees • {dept.code}
                                </p>
                                {inActive && daysUntilEnd !== null && (
                                  <p className="text-xs text-amber-700">
                                    Ends in {daysUntilEnd} day{daysUntilEnd !== 1 ? 's' : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      });
                    })()
                  ) : (
                    <div className="text-center py-4">
                      <Info className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                      <p className="text-blue-700 font-medium">Select a template first</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Choose a template to see applicable departments
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addEditTemplateAssignment}
                disabled={!editSelectedTemplate || editSelectedDepts.length === 0}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Template Assignment
              </Button>

              <div className="text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  {editSelectedTemplate ? (
                    <>
                      Departments highlighted in <span className="font-medium text-green-700">green</span> are applicable to this template.
                      {editShowOnlyApplicable && " Showing only applicable departments."}
                    </>
                  ) : (
                    "Departments in active cycles can still be added. They will be planned for this cycle and can be activated when the current cycle closes."
                  )}
                </p>
              </div>
            </div>

            {editForm.templateAssignments.length > 0 && (
              <div className="space-y-3">
                <Label>Assigned Templates ({editForm.templateAssignments.length})</Label>
                <div className="space-y-2">
                  {editForm.templateAssignments.map((assignment, index) => {
                    const activeDepts = assignment.departmentStatus?.filter(dept => dept.hasActiveCycle) || [];
                    const hasActiveDepts = activeDepts.length > 0;
                    
                    return (
                      <Card key={index} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                <span className="font-medium">{assignment.templateName}</span>
                                <Badge variant="outline">
                                  {formatCycleType(assignment.templateType)}
                                </Badge>
                                {hasActiveDepts && (
                                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {activeDepts.length} dept{activeDepts.length !== 1 ? 's' : ''} in active cycles
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">Departments:</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                                  {assignment.departmentStatus?.map((dept, idx) => (
                                    <div key={idx} className="text-sm">
                                      <div className="flex items-center gap-2">
                                        <span>{dept.departmentName}</span>
                                        {dept.hasActiveCycle ? (
                                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                            <Clock className="w-2 h-2 mr-1" />
                                            Active: {dept.activeCycleName}
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                            <CheckCircle className="w-2 h-2 mr-1" />
                                            Available
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeEditTemplateAssignment(index)}
                              className="ml-2"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {editForm.templateAssignments.length === 0 && (
              <div className="text-center py-8 space-y-3 border rounded-lg">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium">No template assignments</p>
                  <p className="text-sm text-muted-foreground">
                    Add template assignments to activate this cycle
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setEditingCycle(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={updateCycle}
              disabled={loading || editForm.templateAssignments.length === 0}
            >
              {loading ? 'Saving...' : 'Save Templates'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}