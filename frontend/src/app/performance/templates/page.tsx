'use client';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash, X, Eye, Filter, Search, Check, AlertCircle, Users, FileText, BarChart } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { api } from '@/lib/api';
import {
  AppraisalTemplateType,
  AppraisalRatingScaleType,
} from '@/types/performance';
import type { Department, Position } from '@/types/org-structure';

/* ----------  TYPES + CONSTANTS  ---------- */
type Criterion = {
  key: string;
  title: string;
  details?: string;
  weight?: number;
  maxScore?: number;
  required?: boolean;
};

type Template = {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  templateType?: AppraisalTemplateType;
  ratingScale?: {
    type: AppraisalRatingScaleType;
    min: number;
    max: number;
  };
  instructions?: string;
  criteria?: Criterion[];
  applicableDepartmentIds?: string[];
  applicablePositionIds?: string[];
  createdAt?: string;
  updatedAt?: string;
};

const TEMPLATE_TYPES = Object.values(AppraisalTemplateType);
const SCALE_TYPES = Object.values(AppraisalRatingScaleType);
const SCALE_MAP: Record<AppraisalRatingScaleType, { min: number; max: number; label: string }> = {
  THREE_POINT: { min: 1, max: 3, label: '3-Point (1-3)' },
  FIVE_POINT: { min: 1, max: 5, label: '5-Point (1-5)' },
  TEN_POINT: { min: 1, max: 10, label: '10-Point (1-10)' },
};

/* ----------  COMPONENT  ---------- */
export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  /* form state */
  const [form, setForm] = useState({
    name: '',
    description: '',
    templateType: AppraisalTemplateType.ANNUAL,
    ratingType: AppraisalRatingScaleType.FIVE_POINT,
    instructions: '',
    deptIds: [] as string[],
    posIds: [] as string[],
    criteria: [] as Criterion[],
  });
  const [editId, setEditId] = useState<string | null>(null);

  /* ----------  DATA LOADING  ---------- */
  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesRes, deptsRes, positionsRes] = await Promise.all([
        api.get('/performance/templates'),
        api.get('/organization-structure/departments'),
        api.get('/organization-structure/positions'),
      ]);

      const templatesData = Array.isArray(templatesRes.data) ? templatesRes.data : [];
      setTemplates(templatesData);
      setFilteredTemplates(templatesData);
      setDepartments(Array.isArray(deptsRes.data) ? deptsRes.data : []);
      setPositions(Array.isArray(positionsRes.data) ? positionsRes.data : []);
    } catch (error) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ----------  FILTERING  ---------- */
  useEffect(() => {
    let filtered = templates;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(template => 
        activeFilter === 'active' ? template.isActive : !template.isActive
      );
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(template => template.templateType === selectedType);
    }

    setFilteredTemplates(filtered);
  }, [searchTerm, activeFilter, selectedType, templates]);

  /* ----------  TEMPLATE ACTIONS  ---------- */
  const handleSaveTemplate = async () => {
    // Validation: Template name is required
    if (!form.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    // Validation: Check if criteria are filled
    const invalidCriteria = form.criteria.filter(c => 
      !c.title.trim() || // title is empty
      (c.weight !== undefined && (c.weight < 0 || c.weight > 100)) || // invalid weight
      (c.maxScore !== undefined && (c.maxScore < 1 || c.maxScore > SCALE_MAP[form.ratingType].max)) // invalid max score
    );

    if (form.criteria.length === 0) {
      toast.error('Please add at least one evaluation criterion');
      return;
    }

    if (invalidCriteria.length > 0) {
      toast.error('Please fill in all required criterion fields and ensure values are valid');
      return;
    }

    // Check for duplicate criterion titles
    const criterionTitles = form.criteria.map(c => c.title.trim().toLowerCase());
    const hasDuplicates = new Set(criterionTitles).size !== criterionTitles.length;
    if (hasDuplicates) {
      toast.error('Duplicate criterion titles found. Please use unique titles for each criterion.');
      return;
    }

    const payload = {
      name: form.name,
      description: form.description,
      templateType: form.templateType,
      ratingScale: { type: form.ratingType, ...SCALE_MAP[form.ratingType] },
      instructions: form.instructions,
      applicableDepartmentIds: form.deptIds,
      applicablePositionIds: form.posIds,
      criteria: form.criteria.map(criterion => ({
        ...criterion,
        title: criterion.title.trim(),
        details: criterion.details?.trim(),
        weight: criterion.weight || 0,
        maxScore: criterion.maxScore || SCALE_MAP[form.ratingType].max,
        required: criterion.required !== false // default to true if not specified
      })),
    };

    try {
      if (editId) {
        await api.patch(`/performance/templates/${editId}`, payload);
        toast.success('Template updated successfully');
      } else {
        await api.post('/performance/templates', payload);
        toast.success('Template created successfully');
      }
      setOpenDialog(false);
      await loadData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Save failed');
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate "${name}"?`)) {
      return;
    }

    try {
      await api.patch(`/performance/templates/${id}/deactivate`);
      toast.success('Template deactivated');
      await loadData();
    } catch (e: any) {
      if (e.response?.status === 409) {
        toast.error('Cannot deactivate: template is used by an active cycle');
      } else {
        toast.error(e.response?.data?.message || 'Deactivation failed');
      }
    }
  };

  const openEditDialog = (template: Template) => {
    setEditId(template._id);
    setForm({
      name: template.name,
      description: template.description || '',
      templateType: template.templateType || AppraisalTemplateType.ANNUAL,
      ratingType: template.ratingScale?.type || AppraisalRatingScaleType.FIVE_POINT,
      instructions: template.instructions || '',
      deptIds: template.applicableDepartmentIds || [],
      posIds: template.applicablePositionIds || [],
      criteria: template.criteria || [],
    });
    setOpenDialog(true);
  };

  const openNewDialog = () => {
    setEditId(null);
    setForm({
      name: '',
      description: '',
      templateType: AppraisalTemplateType.ANNUAL,
      ratingType: AppraisalRatingScaleType.FIVE_POINT,
      instructions: '',
      deptIds: [],
      posIds: [],
      criteria: [],
    });
    setOpenDialog(true);
  };

  /* ----------  CRITERIA HANDLERS  ---------- */
  const addCriterion = () => {
    setForm({
      ...form,
      criteria: [
        ...form.criteria,
        {
          key: Date.now().toString(),
          title: '',
          details: '',
          weight: 10,
          maxScore: SCALE_MAP[form.ratingType].max,
          required: true,
        },
      ],
    });
  };

  const updateCriterion = (idx: number, field: keyof Criterion, val: any) => {
    const updatedCriteria = [...form.criteria];
    updatedCriteria[idx] = { ...updatedCriteria[idx], [field]: val };
    setForm({ ...form, criteria: updatedCriteria });
  };

  const removeCriterion = (idx: number) => {
    const updatedCriteria = [...form.criteria];
    updatedCriteria.splice(idx, 1);
    setForm({ ...form, criteria: updatedCriteria });
  };

  /* ----------  MULTI-SELECT HELPERS  ---------- */
  const toggleDept = (id: string) => {
    setForm({
      ...form,
      deptIds: form.deptIds.includes(id)
        ? form.deptIds.filter((d) => d !== id)
        : [...form.deptIds, id],
    });
  };

  const togglePos = (id: string) => {
    setForm({
      ...form,
      posIds: form.posIds.includes(id)
        ? form.posIds.filter((p) => p !== id)
        : [...form.posIds, id],
    });
  };

  /* ----------  HELPER FUNCTIONS  ---------- */
  const getTemplateTypeColor = (type: string) => {
    switch (type) {
      case 'ANNUAL': return 'bg-blue-100 text-blue-800';
      case 'SEMI_ANNUAL': return 'bg-purple-100 text-purple-800';
      case 'PROBATIONARY': return 'bg-amber-100 text-amber-800';
      case 'PROJECT': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  /* ----------  RENDER  ---------- */
  return (
    <AppShell title="Appraisal Templates" allowedRoles={['HR Employee', 'HR Manager', 'System Admin']}>
      <div className="space-y-6">
        {/* Header Card */}
        <Card className="border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">Appraisal Templates</CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  Create and manage performance appraisal templates. Templates define the criteria and rating scales for evaluations.
                </CardDescription>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search templates..."
                    className="pl-10 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {TEMPLATE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={openNewDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                New Template
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Templates</p>
                      <p className="text-2xl font-bold">{templates.length}</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Active</p>
                      <p className="text-2xl font-bold">{templates.filter(t => t.isActive).length}</p>
                    </div>
                    <Check className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Departments</p>
                      <p className="text-2xl font-bold">{departments.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Positions</p>
                      <p className="text-2xl font-bold">{positions.length}</p>
                    </div>
                    <BarChart className="h-8 w-8 text-amber-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Templates Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Template List</CardTitle>
                <CardDescription>
                  Showing {filteredTemplates.length} of {templates.length} templates
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={activeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={activeFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter('active')}
                >
                  Active
                </Button>
                <Button
                  variant={activeFilter === 'inactive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter('inactive')}
                >
                  Inactive
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500">Loading templates...</p>
                </div>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12 border rounded-lg">
                <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No templates found</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {searchTerm || activeFilter !== 'all' || selectedType !== 'all'
                    ? 'No templates match your search criteria. Try adjusting your filters.'
                    : 'Get started by creating your first appraisal template.'}
                </p>
                <Button onClick={openNewDialog} className="mt-4">
                  Create Template
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="font-semibold">Template</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Rating Scale</TableHead>
                      <TableHead className="font-semibold">Criteria</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Last Updated</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template) => (
                      <TableRow key={template._id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{template.name}</p>
                            {template.description && (
                              <p className="text-sm text-gray-500 truncate max-w-xs">
                                {template.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTemplateTypeColor(template.templateType || '')}>
                            {template.templateType?.replace('_', ' ') || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {template.ratingScale ? (
                            <div className="text-sm">
                              <span className="font-medium">{template.ratingScale.min}-{template.ratingScale.max}</span>
                              <span className="text-gray-500 ml-2">
                                ({template.ratingScale.type.replace('_', ' ')})
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {template.criteria?.length || 0} criteria
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${template.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className={`text-sm ${template.isActive ? 'text-green-700' : 'text-gray-500'}`}>
                              {template.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {formatDate(template.updatedAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() => openEditDialog(template)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Edit template</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDeactivate(template._id, template.name)}
                                    disabled={!template.isActive}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Deactivate template</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Template Form Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editId ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              Define the structure, criteria, and settings for your appraisal template.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="criteria">Criteria</TabsTrigger>
              <TabsTrigger value="applicability">Applicability</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[60vh] pr-4">
              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="font-medium">Template Name *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g., Annual Performance Review"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="font-medium">Description</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Brief description of this template's purpose"
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="instructions" className="font-medium">Instructions for Managers</Label>
                    <Textarea
                      id="instructions"
                      value={form.instructions}
                      onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                      placeholder="Guidelines and best practices for conducting appraisals"
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="templateType" className="font-medium">Template Type *</Label>
                    <Select
                      value={form.templateType}
                      onValueChange={(value) => setForm({ ...form, templateType: value as AppraisalTemplateType })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select template type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ratingType" className="font-medium">Rating Scale *</Label>
                    <Select
                      value={form.ratingType}
                      onValueChange={(value) => setForm({ ...form, ratingType: value as AppraisalRatingScaleType })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select rating scale" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCALE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {SCALE_MAP[type].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500 mt-2">
                      Selected scale: {SCALE_MAP[form.ratingType].min} to {SCALE_MAP[form.ratingType].max} points
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="criteria" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-lg font-medium">Evaluation Criteria</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Define the questions and metrics for performance evaluation
                    </p>
                    {/* Validation message */}
                    {form.criteria.length === 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                        ⚠️ At least one criterion is required. Click "Add Criterion" to get started.
                      </div>
                    )}
                  </div>
                  <Button onClick={addCriterion} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Criterion
                  </Button>
                </div>

                {form.criteria.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg bg-gray-50">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No criteria added yet</p>
                    <p className="text-sm text-gray-400 mt-1 mb-4">
                      Add criteria to define what will be evaluated. At least one criterion is required.
                    </p>
                    <Button onClick={addCriterion} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Criterion
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Validation summary */}
                    {form.criteria.some(c => !c.title.trim()) && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Some criteria are incomplete:</span>
                        </div>
                        <ul className="text-sm text-red-600 mt-1 ml-6 list-disc">
                          {form.criteria.map((c, idx) => !c.title.trim() && (
                            <li key={c.key}>Criterion {idx + 1} needs a title</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {form.criteria.map((criterion, idx) => {
                      const isInvalid = !criterion.title.trim();
                      
                      return (
                        <Card 
                          key={criterion.key} 
                          className={`border-l-4 ${isInvalid ? 'border-l-red-500 bg-red-50/50' : 'border-l-blue-500'}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`font-medium ${isInvalid ? 'text-red-700' : 'text-gray-900'}`}>
                                    Criterion {idx + 1}
                                  </span>
                                  {isInvalid && (
                                    <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-200">
                                      Incomplete
                                    </Badge>
                                  )}
                                  {criterion.required && !isInvalid && (
                                    <Badge variant="outline" className="text-xs">Required</Badge>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <div className="flex items-center gap-1">
                                      <Label>Question *</Label>
                                      {isInvalid && (
                                        <span className="text-xs text-red-500">(Required)</span>
                                      )}
                                    </div>
                                    <Input
                                      value={criterion.title}
                                      onChange={(e) => updateCriterion(idx, 'title', e.target.value)}
                                      placeholder="e.g., Communication Skills"
                                      className={`mt-1 ${isInvalid ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
                                    />
                                    {isInvalid && (
                                      <p className="text-xs text-red-500 mt-1">
                                        Please enter a question for this criterion
                                      </p>
                                    )}
                                  </div>
                                  
                                  <div>
                                    <Label>Details & Examples</Label>
                                    <Textarea
                                      value={criterion.details}
                                      onChange={(e) => updateCriterion(idx, 'details', e.target.value)}
                                      placeholder="Description or examples for guidance"
                                      className="mt-1"
                                      rows={2}
                                    />
                                  </div>
                                  
                                  <div>
                                    <div className="flex items-center gap-1">
                                      <Label>Weight (%) *</Label>
                                    </div>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={criterion.weight}
                                      onChange={(e) => updateCriterion(idx, 'weight', Number(e.target.value))}
                                      className="mt-1"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                      Determines importance in final score calculation
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <div className="flex items-center gap-1">
                                      <Label>Max Score *</Label>
                                    </div>
                                    <Input
                                      type="number"
                                      min={1}
                                      max={SCALE_MAP[form.ratingType].max}
                                      value={criterion.maxScore}
                                      onChange={(e) => updateCriterion(idx, 'maxScore', Number(e.target.value))}
                                      className="mt-1"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                      Maximum points (scale: {SCALE_MAP[form.ratingType].min}-{SCALE_MAP[form.ratingType].max})
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="ml-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => removeCriterion(idx)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={criterion.required}
                                    onCheckedChange={(checked) => updateCriterion(idx, 'required', checked)}
                                  />
                                  <Label className="text-sm">Required field</Label>
                                </div>
                              </div>
                              <div className="text-sm text-gray-500">
                                Weight: {criterion.weight || 0}% • Max: {criterion.maxScore || 0} points
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {/* Total weight indicator */}
                    {form.criteria.length > 0 && (
                      <div className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Total Weight</p>
                            <p className="text-sm text-gray-500">
                              Sum of all criterion weights should ideally equal 100%
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${
                              form.criteria.reduce((sum, c) => sum + (c.weight || 0), 0) === 100 
                                ? 'text-green-600' 
                                : 'text-amber-600'
                            }`}>
                              {form.criteria.reduce((sum, c) => sum + (c.weight || 0), 0)}%
                            </p>
                            <p className="text-sm text-gray-500">
                              {form.criteria.length} criteria
                            </p>
                          </div>
                        </div>
                        {form.criteria.reduce((sum, c) => sum + (c.weight || 0), 0) !== 100 && (
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
                            ⚠️ Total weight is not 100%. Scores will be normalized proportionally.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="applicability" className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <Label className="text-lg font-medium mb-4">Applicable Departments</Label>
                    {departments.length === 0 ? (
                      <div className="text-center py-4 border rounded-lg bg-gray-50">
                        <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">No departments available</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-4 border rounded-lg">
                        {departments.map((dept) => (
                          <div
                            key={dept._id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${form.deptIds.includes(dept._id ?? '')
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:bg-gray-50'
                              }`}
                            onClick={() => toggleDept(dept._id ?? '')}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${form.deptIds.includes(dept._id ?? '')
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-300'
                              }`}>
                              {form.deptIds.includes(dept._id ?? '') && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{dept.name}</p>
                              <p className="text-sm text-gray-500">{dept.description}</p>
                            </div>
                            <Badge variant="outline">{dept.employeeCount || 0} employees</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-lg font-medium mb-4">Applicable Positions</Label>
                    {positions.length === 0 ? (
                      <div className="text-center py-4 border rounded-lg bg-gray-50">
                        <BarChart className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">No positions available</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-4 border rounded-lg">
                        {positions.map((position) => (
                          <div
                            key={position._id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${form.posIds.includes(position._id ?? '')
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:bg-gray-50'
                              }`}
                            onClick={() => togglePos(position._id ?? '')}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${form.posIds.includes(position._id ?? '')
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-300'
                              }`}>
                              {form.posIds.includes(position._id ?? '') && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{position.title}</p>
                              <p className="text-sm text-gray-500">{position.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">Applicability Note</p>
                        <p className="text-sm text-blue-700 mt-1">
                          Only employees in selected departments and positions will be eligible
                          for appraisal using this template. Leave all unchecked to make it
                          applicable to all departments and positions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <div>
                <div className="text-sm text-gray-500">
                  {form.criteria.length} criteria • {form.deptIds.length} departments • {form.posIds.length} positions
                </div>
                {/* Validation status */}
                {form.criteria.length === 0 ? (
                  <div className="text-sm text-red-500 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="h-4 w-4" />
                    Add at least one criterion
                  </div>
                ) : form.criteria.some(c => !c.title.trim()) ? (
                  <div className="text-sm text-red-500 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="h-4 w-4" />
                    Some criteria are incomplete
                  </div>
                ) : (
                  <div className="text-sm text-green-500 font-medium flex items-center gap-1 mt-1">
                    <Check className="h-4 w-4" />
                    All criteria are filled
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveTemplate} 
                  className="gap-2"
                  disabled={form.criteria.length === 0 || form.criteria.some(c => !c.title.trim())}
                >
                  <Check className="h-4 w-4" />
                  {editId ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}