'use client';
import { useEffect, useState } from 'react';
import { Plus, X, Users, FileText, AlertCircle, Check, Filter, Search } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { AppraisalAssignmentStatus } from '@/types/performance';
import { cn } from '@/lib/utils';

type Cycle = {
  _id: string;
  name: string;
  status: string;
  templateAssignments?: Array<{
    templateId: string;
    templateName: string;
    departmentIds: string[];
  }>;
};

type Template = {
  _id: string;
  name: string;
  templateType: string;
  applicableDepartmentIds?: string[];
  applicablePositionIds?: string[];
};

type Manager = {
  _id: string;
  employeeProfileId?: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  departmentName?: string;
  positionTitle?: string;
  systemRoles: string[];
};

type Employee = {
  _id: string;
  employeeProfileId?: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  workEmail: string;
  status: string;
  profilePictureUrl?: string;
  departmentName?: string;
  positionTitle?: string;
  primaryDepartmentId?: string;
  primaryPositionId?: string;
  systemRoles: string[];
  managerProfileId?: string;
  managerName?: string;
};

type AssignmentPlan = {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  departmentId?: string;
  departmentName?: string;
  positionId?: string;
  positionName?: string;
  templateId: string;
  templateName: string;
  managerId: string;
  managerName: string;
};

type ExistingAssignment = {
  _id: string;
  employeeProfileId: string;
  cycleId: string;
  templateId: string;
  templateName: string;
  status: AppraisalAssignmentStatus;
};

export default function AssignAppraisalsPage() {
  // State for data
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<ExistingAssignment[]>([]);
  
  // State for filters and selection
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for assignment planning
  const [assignmentPlans, setAssignmentPlans] = useState<AssignmentPlan[]>([]);
  const [openPreview, setOpenPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Selected templates for each employee
  const [employeeTemplateMap, setEmployeeTemplateMap] = useState<Record<string, string>>({});
  
  // Available templates for selected cycle
  const [availableTemplates, setAvailableTemplates] = useState<Template[]>([]);

  // Employee selection
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load active cycles only
      const cyclesRes = await api.get('/performance/cycles?status=ACTIVE');
      const cyclesData = Array.isArray(cyclesRes.data) ? cyclesRes.data : [];
      setCycles(cyclesData);
      
      // Load all templates
      const templatesRes = await api.get('/performance/templates');
      const templatesData = Array.isArray(templatesRes.data) ? templatesRes.data : [];
      setTemplates(templatesData);
      
      // Load ALL employees and filter for department heads in frontend
      const managersRes = await api.get('/employee-profile/admin/search');
      const allEmployees = Array.isArray(managersRes.data) ? managersRes.data : [];
      
      // Filter for department heads: Check multiple possible locations for roles
      const departmentHeads = allEmployees.filter(emp => {
        // Check multiple possible locations for roles
        const roles = [];
        
        if (emp.systemRoles && Array.isArray(emp.systemRoles)) {
          roles.push(...emp.systemRoles);
        }
        
        if (emp.roles && Array.isArray(emp.roles)) {
          roles.push(...emp.roles);
        }
        
        // Check if it's an object with roles property
        if (emp.accessProfileId && typeof emp.accessProfileId === 'object' && 
            emp.accessProfileId.roles && Array.isArray(emp.accessProfileId.roles)) {
          roles.push(...emp.accessProfileId.roles);
        }
        
        // Check for any variation of department head role name
        const hasRole = roles.some(role => 
          role.toLowerCase().includes('department') && role.toLowerCase().includes('head')
        );
        
        return hasRole;
      });
      
      setManagers(departmentHeads);
      
    } catch (error) {
      toast.error('Failed to load initial data');
      console.error('Load initial data error:', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  // When cycle is selected, load its employees and existing assignments
  useEffect(() => {
    if (!selectedCycleId) {
      setEmployees([]);
      setExistingAssignments([]);
      setAvailableTemplates([]);
      setSelectedEmployeeIds(new Set());
      return;
    }

// Update the loadCycleData function to use records instead
const loadCycleData = async () => {
  try {
    setLoading(true);
    
    // Get the selected cycle
    const selectedCycle = cycles.find(c => c._id === selectedCycleId);
    if (!selectedCycle) return;
    
    // Get all template assignments from this cycle
    const cycleTemplateAssignments = selectedCycle.templateAssignments || [];
    
    if (cycleTemplateAssignments.length === 0) {
      toast.error('This cycle has no templates assigned yet.');
      setEmployees([]);
      setExistingAssignments([]);
      setAvailableTemplates([]);
      setSelectedEmployeeIds(new Set());
      return;
    }
    
    // Try to get records for this cycle instead of assignments
    let existingAssignmentsData: ExistingAssignment[] = [];
    
    try {
      // Try using the records endpoint with cycleId filter
      const recordsRes = await api.get(`/performance/records?cycleId=${selectedCycleId}`);
      const records = Array.isArray(recordsRes.data) ? recordsRes.data : [];
      
      // Convert records to assignment format
      existingAssignmentsData = records.map((record: any) => ({
        _id: record._id,
        employeeProfileId: record.employeeProfileId || record.employeeId,
        cycleId: record.cycleId,
        templateId: record.templateId,
        templateName: record.templateName || 'Unknown',
        status: record.status || AppraisalAssignmentStatus.NOT_STARTED
      }));
      
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Try without filter
        try {
          const recordsRes = await api.get('/performance/records');
          const allRecords = Array.isArray(recordsRes.data) ? recordsRes.data : [];
          
          // Filter locally by cycleId
          const cycleRecords = allRecords.filter((record: any) => 
            record.cycleId === selectedCycleId
          );
          
          existingAssignmentsData = cycleRecords.map((record: any) => ({
            _id: record._id,
            employeeProfileId: record.employeeProfileId || record.employeeId,
            cycleId: record.cycleId,
            templateId: record.templateId,
            templateName: record.templateName || 'Unknown',
            status: record.status || AppraisalAssignmentStatus.NOT_STARTED
          }));
        } catch (innerError) {
          console.warn('Could not load records:', innerError);
          existingAssignmentsData = [];
        }
      } else {
        console.warn('Could not load records:', error);
        existingAssignmentsData = [];
      }
    }
    
    setExistingAssignments(existingAssignmentsData);
    
    // Get all department IDs from this cycle's template assignments
    const departmentIds = new Set<string>();
    cycleTemplateAssignments.forEach(assignment => {
      assignment.departmentIds.forEach(deptId => departmentIds.add(deptId));
    });
    
    // Get templates available for this cycle
    const cycleTemplateIds = cycleTemplateAssignments.map(a => a.templateId);
    const available = templates.filter(t => cycleTemplateIds.includes(t._id));
    setAvailableTemplates(available);
    
    // Load all employees
    const employeesRes = await api.get('/employee-profile/admin/search');
    const allEmployees = Array.isArray(employeesRes.data) ? employeesRes.data : [];
    
    // Filter for ACTIVE employees
    const activeEmployees = allEmployees.filter(emp => 
      emp.status && typeof emp.status === 'string' && emp.status.toUpperCase() === 'ACTIVE'
    );
    
    // Filter out department heads (managers) - only regular employees
    const regularEmployees = activeEmployees.filter(emp => {
      // Check if they have any department head role
      const roles = [];
      
      if (emp.systemRoles && Array.isArray(emp.systemRoles)) {
        roles.push(...emp.systemRoles);
      }
      
      if (emp.roles && Array.isArray(emp.roles)) {
        roles.push(...emp.roles);
      }
      
      // Check if it's an object with roles property
      if (emp.accessProfileId && typeof emp.accessProfileId === 'object' && 
          emp.accessProfileId.roles && Array.isArray(emp.accessProfileId.roles)) {
        roles.push(...emp.accessProfileId.roles);
      }
      
      // Check for any variation of department head role name
      const hasDeptHeadRole = roles.some(role => 
        role.toLowerCase().includes('department') && role.toLowerCase().includes('head')
      );
      
      return !hasDeptHeadRole;
    });
    
    // FILTER: Only show employees whose department is included in the cycle
    const eligibleEmployees = regularEmployees.filter(emp => {
      // If employee has no department, they can't be assigned
      if (!emp.primaryDepartmentId) {
        return false;
      }
      
      // Check if this employee's department is in the cycle's template assignments
      const isInCycleDepartment = cycleTemplateAssignments.some(assignment => 
        assignment.departmentIds.includes(emp.primaryDepartmentId)
      );
      
      return isInCycleDepartment;
    });
    
    setEmployees(eligibleEmployees);
    
    // Initialize employee template map - ONLY for eligible employees
    if (available.length > 0 && eligibleEmployees.length > 0) {
      const initialMap: Record<string, string> = {};
      const newSelectedIds = new Set<string>();
      
      eligibleEmployees.forEach(emp => {
        // Only initialize template selection for employees without existing assignments
        const hasExistingAssignment = existingAssignmentsData.some(a => 
          a.employeeProfileId === emp._id
        );
        
        if (!hasExistingAssignment) {
          // Find applicable templates for this employee based on their department
          const applicableTemplates = available.filter(template => {
            // If template has no department restrictions, it's applicable
            if (!template.applicableDepartmentIds || template.applicableDepartmentIds.length === 0) {
              return true;
            }
            
            // Check if employee's department matches template's applicable departments
            if (!emp.primaryDepartmentId) return false;
            
            return template.applicableDepartmentIds.includes(emp.primaryDepartmentId);
          });
          
          if (applicableTemplates.length > 0) {
            // Select the first applicable template
            initialMap[emp._id] = applicableTemplates[0]._id;
            newSelectedIds.add(emp._id); // Auto-select eligible employees
          }
        }
      });
      
      setEmployeeTemplateMap(initialMap);
      setSelectedEmployeeIds(newSelectedIds);
    } else {
      // Reset if no eligible employees or templates
      setEmployeeTemplateMap({});
      setSelectedEmployeeIds(new Set());
    }
    
  } catch (error) {
    toast.error('Failed to load cycle data');
    console.error('Load cycle data error:', error instanceof Error ? error.message : String(error));
  } finally {
    setLoading(false);
  }
};    
    loadCycleData();
  }, [selectedCycleId, cycles, templates, managers]);

  // Filter employees based on search term
  const filteredEmployees = employees.filter(emp => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      emp.firstName.toLowerCase().includes(searchLower) ||
      emp.lastName.toLowerCase().includes(searchLower) ||
      emp.employeeNumber.toLowerCase().includes(searchLower) ||
      emp.workEmail.toLowerCase().includes(searchLower) ||
      emp.departmentName?.toLowerCase().includes(searchLower) ||
      emp.positionTitle?.toLowerCase().includes(searchLower)
    );
  });

  // Handle template selection for an employee
  const handleTemplateSelect = (employeeId: string, templateId: string) => {
    setEmployeeTemplateMap(prev => ({
      ...prev,
      [employeeId]: templateId
    }));
  };

  // Handle manager selection
  const handleManagerSelect = (managerId: string) => {
    setSelectedManagerId(managerId);
  };

  // Employee selection functions
  const toggleEmployeeSelection = (employeeId: string) => {
    const existingAssignment = getEmployeeAssignment(employeeId);
    
    if (existingAssignment) {
      toast.error('This employee already has an assignment in this cycle');
      return;
    }
    
    const employee = employees.find(emp => emp._id === employeeId);
    const applicableTemplates = employee ? getApplicableTemplates(employee) : [];
    
    if (applicableTemplates.length === 0) {
      toast.error('This employee has no applicable templates');
      return;
    }
    
    setSelectedEmployeeIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  const selectAllEmployees = () => {
    const allIds = new Set(
      filteredEmployees
        .filter(emp => {
          const existingAssignment = getEmployeeAssignment(emp._id);
          const hasApplicableTemplates = getApplicableTemplates(emp).length > 0;
          return !existingAssignment && hasApplicableTemplates;
        })
        .map(emp => emp._id)
    );
    setSelectedEmployeeIds(allIds);
  };

  const deselectAllEmployees = () => {
    setSelectedEmployeeIds(new Set());
  };

  // Generate assignment plans from SELECTED employees only
  const generateAssignmentPlans = () => {
    const selectedManager = managers.find(m => m._id === selectedManagerId);
    if (!selectedManager) {
      toast.error('Please select a manager first');
      return;
    }

    if (selectedEmployeeIds.size === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    const plans: AssignmentPlan[] = [];
    const errors: string[] = [];

    filteredEmployees.forEach(emp => {
      // Only process selected employees
      if (!selectedEmployeeIds.has(emp._id)) return;

      const templateId = employeeTemplateMap[emp._id];
      if (!templateId) {
        errors.push(`${emp.firstName} ${emp.lastName} has no template selected`);
        return;
      }

      // Check if employee already has an assignment in this cycle
      const existingAssignment = existingAssignments.find(a => 
        a.employeeProfileId === emp._id && a.cycleId === selectedCycleId
      );

      if (existingAssignment) {
        errors.push(`${emp.firstName} ${emp.lastName} already has assignment: ${existingAssignment.templateName} (${existingAssignment.status})`);
        return;
      }

      // ALSO check if this employee is already in our assignment plans
      // (to prevent duplicate selection in the same batch)
      const alreadyInPlans = plans.some(p => p.employeeId === emp._id);
      if (alreadyInPlans) {
        errors.push(`${emp.firstName} ${emp.lastName} is already selected for assignment in this batch`);
        return;
      }

      const template = availableTemplates.find(t => t._id === templateId);
      if (!template) {
        errors.push(`Template not found for ${emp.firstName} ${emp.lastName}`);
        return;
      }

      // Check template applicability
      if (template.applicableDepartmentIds && template.applicableDepartmentIds.length > 0) {
        if (!emp.primaryDepartmentId || !template.applicableDepartmentIds.includes(emp.primaryDepartmentId)) {
          errors.push(`${emp.firstName} ${emp.lastName} is not in an applicable department for template: ${template.name}`);
          return;
        }
      }

      plans.push({
        employeeId: emp._id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        employeeNumber: emp.employeeNumber,
        departmentId: emp.primaryDepartmentId,
        departmentName: emp.departmentName,
        positionId: emp.primaryPositionId,
        positionName: emp.positionTitle,
        templateId: template._id,
        templateName: template.name,
        managerId: selectedManager._id,
        managerName: `${selectedManager.firstName} ${selectedManager.lastName}`
      });
    });

    if (errors.length > 0) {
      toast.error(`Found ${errors.length} errors. Please fix before proceeding.`, {
        duration: 5000,
      });
      console.log('Assignment errors:', errors);
      return;
    }

    if (plans.length === 0) {
      toast.error('No valid assignments to create');
      return;
    }

    setAssignmentPlans(plans);
    setOpenPreview(true);
  };

  // Create assignments
  const createAssignments = async () => {
    if (assignmentPlans.length === 0) {
      toast.error('No assignments to create');
      return;
    }

    const payload = {
      assignments: assignmentPlans.map(plan => ({
        cycleId: selectedCycleId,
        templateId: plan.templateId,
        employeeProfileId: plan.employeeId,
        departmentId: plan.departmentId,
        positionId: plan.positionId,
        managerProfileId: plan.managerId,
        status: AppraisalAssignmentStatus.NOT_STARTED,
      }))
    };

    try {
      setLoading(true);
      await api.post('/performance/assignments/bulk', payload);
      
      toast.success(`Successfully created ${assignmentPlans.length} assignments`);
      
      // Reset form
      setAssignmentPlans([]);
      setOpenPreview(false);
      setSelectedManagerId('');
      setSelectedEmployeeIds(new Set());
      setEmployeeTemplateMap({});
      
      // Reload data
      if (selectedCycleId) {
        // Reload existing assignments
        const existingAssignmentsRes = await api.get(`/performance/assignments?cycleId=${selectedCycleId}`);
        const existingAssignmentsData = Array.isArray(existingAssignmentsRes.data) ? existingAssignmentsRes.data : [];
        setExistingAssignments(existingAssignmentsData);
        
        // Reset employee selections
        const eligibleEmployees = employees.filter(emp => {
          const hasExistingAssignment = existingAssignmentsData.some(a => 
            a.employeeProfileId === emp._id
          );
          return !hasExistingAssignment;
        });
        
        // Re-initialize template map for remaining eligible employees
        if (availableTemplates.length > 0 && eligibleEmployees.length > 0) {
          const newMap: Record<string, string> = {};
          const newSelectedIds = new Set<string>();
          
          eligibleEmployees.forEach(emp => {
            const applicableTemplates = getApplicableTemplates(emp);
            if (applicableTemplates.length > 0) {
              newMap[emp._id] = applicableTemplates[0]._id;
              newSelectedIds.add(emp._id);
            }
          });
          
          setEmployeeTemplateMap(newMap);
          setSelectedEmployeeIds(newSelectedIds);
        }
      }
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create assignments';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Check if employee already has an assignment
  const getEmployeeAssignment = (employeeId: string) => {
    return existingAssignments.find(a => 
      a.employeeProfileId === employeeId && a.cycleId === selectedCycleId
    );
  };

  // Get available templates for an employee based on department
  const getApplicableTemplates = (employee: Employee) => {
    return availableTemplates.filter(template => {
      // If template has no department restrictions, it's applicable to everyone
      if (!template.applicableDepartmentIds || template.applicableDepartmentIds.length === 0) {
        return true;
      }
      
      // Check if employee's department is in the applicable list
      // If employee has no department, they can't use restricted templates
      if (!employee.primaryDepartmentId) {
        return false;
      }
      
      return template.applicableDepartmentIds.includes(employee.primaryDepartmentId);
    });
  };

  // Stats
  const assignedEmployeesCount = existingAssignments.length;
  const availableEmployeesCount = employees.length;
  const totalEligibleEmployees = employees.filter(emp => 
    !existingAssignments.some(a => a.employeeProfileId === emp._id)
  ).length;
  const totalAssignmentsToCreate = assignmentPlans.length;
  const selectedEmployeesCount = selectedEmployeeIds.size;

  return (
    <AppShell 
      title="Assign Appraisals" 
      allowedRoles={['HR Employee', 'HR Manager', 'System Admin']}
    >
      <div className="space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Assign Appraisals</CardTitle>
                <CardDescription>
                  Assign performance appraisal templates to employees within active cycles.
                  Each employee can only have one template per cycle.
                </CardDescription>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Active Cycles</p>
                      <p className="text-2xl font-bold">{cycles.filter(c => c.status === 'ACTIVE').length}</p>
                    </div>
                    <div className="p-2 rounded-full bg-green-100">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Available for Assignment</p>
                      <p className="text-2xl font-bold">{totalEligibleEmployees}</p>
                      <p className="text-xs text-gray-400">
                        of {availableEmployeesCount} eligible
                      </p>
                    </div>
                    <div className="p-2 rounded-full bg-blue-100">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Already Assigned</p>
                      <p className="text-2xl font-bold">{assignedEmployeesCount}</p>
                      <p className="text-xs text-gray-400">
                        in this cycle
                      </p>
                    </div>
                    <div className="p-2 rounded-full bg-amber-100">
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Selected</p>
                      <p className="text-2xl font-bold">{selectedEmployeesCount}</p>
                    </div>
                    <div className="p-2 rounded-full bg-purple-100">
                      <Check className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Main Assignment Card */}
        <Card>
          <CardHeader>
            <CardTitle>Bulk Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Select Cycle and Manager */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-medium">Select Appraisal Cycle *</Label>
                <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an active cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    {cycles
                      .filter(cycle => cycle.status === 'ACTIVE')
                      .map(cycle => (
                        <SelectItem key={cycle._id} value={cycle._id}>
                          {cycle.name}
                          {cycle.templateAssignments && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({cycle.templateAssignments.length} templates)
                            </span>
                          )}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                {selectedCycleId && (
                  <p className="text-sm text-muted-foreground">
                    {availableTemplates.length} templates available in this cycle
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Select Department Head (Manager) *</Label>
                <Select 
                  value={selectedManagerId} 
                  onValueChange={handleManagerSelect}
                  disabled={!selectedCycleId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a department head" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map(manager => (
                      <SelectItem key={manager._id} value={manager._id}>
                        {manager.firstName} {manager.lastName}
                        {manager.departmentName && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({manager.departmentName})
                          </span>
                        )}
                        <Badge variant="outline" className="ml-2 text-xs">Department Head</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Only employees with "Department Head" system role are shown
                </p>
              </div>
            </div>

            {/* Step 2: Employee Selection and Template Assignment */}
            {selectedCycleId && selectedManagerId && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-lg font-medium">Assign Templates to Employees</Label>
                      <p className="text-sm text-muted-foreground">
                        Select employees and choose templates. {selectedEmployeesCount} of {totalEligibleEmployees} available selected
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search employees..."
                          className="pl-10 w-64"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={selectAllEmployees}
                          disabled={totalEligibleEmployees === 0}
                        >
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={deselectAllEmployees}
                          disabled={selectedEmployeesCount === 0}
                        >
                          Deselect All
                        </Button>
                      </div>
                      <Button
                        onClick={generateAssignmentPlans}
                        disabled={loading || selectedEmployeesCount === 0}
                        className="gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Preview Assignments ({selectedEmployeesCount})
                      </Button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg">
                      <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">No employees found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {searchTerm ? 'Try adjusting your search' : 
                         'No active employees found in the departments assigned to this cycle'}
                      </p>
                      {selectedCycleId && (
                        <div className="mt-4 text-sm text-amber-600 bg-amber-50 p-3 rounded inline-block">
                          <AlertCircle className="h-4 w-4 inline mr-1" />
                          Only employees in departments assigned to this cycle are shown.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-gray-50">
                            <TableRow>
                              <TableHead className="w-12">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4"
                                  checked={selectedEmployeeIds.size === totalEligibleEmployees && totalEligibleEmployees > 0}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      selectAllEmployees();
                                    } else {
                                      deselectAllEmployees();
                                    }
                                  }}
                                  disabled={totalEligibleEmployees === 0}
                                />
                              </TableHead>
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>Employee</TableHead>
                              <TableHead>ID</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead>Position</TableHead>
                              <TableHead>Template Assignment</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredEmployees.map((emp, index) => {
                              const existingAssignment = getEmployeeAssignment(emp._id);
                              const applicableTemplates = getApplicableTemplates(emp);
                              const selectedTemplateId = employeeTemplateMap[emp._id];
                              const isSelected = selectedEmployeeIds.has(emp._id);
                              const hasApplicableTemplates = applicableTemplates.length > 0;
                              const hasExistingAssignment = !!existingAssignment;
                              
                              return (
                                <TableRow 
                                  key={emp._id} 
                                  className={cn(
                                    hasExistingAssignment ? 'bg-gray-100' : '',
                                    !isSelected ? 'opacity-70' : '',
                                    !hasApplicableTemplates ? 'bg-red-50' : ''
                                  )}
                                >
                                  <TableCell>
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4"
                                      checked={isSelected}
                                      onChange={() => toggleEmployeeSelection(emp._id)}
                                      disabled={!hasApplicableTemplates || hasExistingAssignment}
                                    />
                                  </TableCell>
                                  <TableCell>{index + 1}</TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">
                                        {emp.firstName} {emp.lastName}
                                      </p>
                                      <p className="text-sm text-gray-500">{emp.workEmail}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{emp.employeeNumber}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    {emp.departmentName || (
                                      <span className="text-red-500 text-xs">Not set</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {emp.positionTitle || (
                                      <span className="text-red-500 text-xs">Not set</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {existingAssignment ? (
                                      <div className="space-y-1">
                                        <Badge variant="secondary" className="gap-1">
                                          <FileText className="h-3 w-3" />
                                          {existingAssignment.templateName}
                                        </Badge>
                                        <p className="text-xs text-gray-500">
                                          Already assigned to this cycle
                                        </p>
                                        <Badge 
                                          variant="outline" 
                                          className={cn(
                                            "text-xs",
                                            existingAssignment.status === AppraisalAssignmentStatus.ACKNOWLEDGED ? 'bg-green-50 text-green-700 border-green-200' :
                                            existingAssignment.status === AppraisalAssignmentStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            existingAssignment.status === AppraisalAssignmentStatus.NOT_STARTED ? 'bg-gray-50 text-gray-700 border-gray-200' :
                                            existingAssignment.status === AppraisalAssignmentStatus.SUBMITTED ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                            existingAssignment.status === AppraisalAssignmentStatus.PUBLISHED ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                            'bg-amber-50 text-amber-700 border-amber-200'
                                          )}
                                        >
                                          {existingAssignment.status}
                                        </Badge>
                                      </div>
                                    ) : applicableTemplates.length > 0 ? (
                                      <Select
                                        value={selectedTemplateId}
                                        onValueChange={(value) => handleTemplateSelect(emp._id, value)}
                                        disabled={!isSelected || hasExistingAssignment}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {applicableTemplates.map(template => (
                                            <SelectItem key={template._id} value={template._id}>
                                              {template.name}
                                              {template.applicableDepartmentIds && 
                                               template.applicableDepartmentIds.length > 0 && (
                                                <span className="text-xs text-muted-foreground ml-2">
                                                  (Restricted)
                                                </span>
                                              )}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <div className="text-sm text-red-600">
                                        No applicable templates
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {existingAssignment ? (
                                      <Badge 
                                        className={cn(
                                          "text-white",
                                          existingAssignment.status === AppraisalAssignmentStatus.ACKNOWLEDGED ? 'bg-green-500' :
                                          existingAssignment.status === AppraisalAssignmentStatus.IN_PROGRESS ? 'bg-blue-500' :
                                          existingAssignment.status === AppraisalAssignmentStatus.NOT_STARTED ? 'bg-gray-500' :
                                          existingAssignment.status === AppraisalAssignmentStatus.SUBMITTED ? 'bg-yellow-500' :
                                          existingAssignment.status === AppraisalAssignmentStatus.PUBLISHED ? 'bg-purple-500' :
                                          'bg-amber-500'
                                        )}
                                      >
                                        {existingAssignment.status}
                                      </Badge>
                                    ) : !hasApplicableTemplates ? (
                                      <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50">
                                        Ineligible
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                                        Available
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">Important Notes</p>
                      <ul className="text-sm text-blue-700 mt-2 space-y-1">
                        <li>• Each employee can only have one template assignment per cycle</li>
                        <li>• Employees already assigned in this cycle are disabled (gray background)</li>
                        <li>• Only active employees in cycle departments are shown (department heads excluded)</li>
                        <li>• Employees without applicable templates are shown in red and disabled</li>
                        <li>• Select available employees and templates before previewing</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assignment Preview Dialog */}
      <Dialog open={openPreview} onOpenChange={setOpenPreview}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Review Assignments</DialogTitle>
            <DialogDescription>
              Review {totalAssignmentsToCreate} assignments before creating them.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="list">Assignment List</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Department</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignmentPlans.map((plan, index) => (
                      <TableRow key={`${plan.employeeId}-${plan.templateId}-${index}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{plan.employeeName}</p>
                            <p className="text-sm text-gray-500">{plan.employeeNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <FileText className="h-3 w-3" />
                            {plan.templateName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{plan.managerName}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{plan.departmentName || 'N/A'}</p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Assignments</p>
                        <p className="text-2xl font-bold">{totalAssignmentsToCreate}</p>
                      </div>
                      <div className="p-2 rounded-full bg-blue-100">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Unique Templates</p>
                        <p className="text-2xl font-bold">
                          {new Set(assignmentPlans.map(p => p.templateId)).size}
                        </p>
                      </div>
                      <div className="p-2 rounded-full bg-green-100">
                        <FileText className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Manager</p>
                        <p className="text-lg font-bold truncate">
                          {assignmentPlans[0]?.managerName || 'N/A'}
                        </p>
                      </div>
                      <div className="p-2 rounded-full bg-purple-100">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <Label>Template Distribution</Label>
                <div className="space-y-2">
                  {Array.from(new Set(assignmentPlans.map(p => p.templateId))).map(templateId => {
                    const template = availableTemplates.find(t => t._id === templateId);
                    const count = assignmentPlans.filter(p => p.templateId === templateId).length;
                    return (
                      <div key={templateId} className="flex items-center justify-between text-sm">
                        <span>{template?.name || 'Unknown Template'}</span>
                        <Badge variant="secondary">{count} employees</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenPreview(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={createAssignments}
              disabled={loading || totalAssignmentsToCreate === 0}
              className="gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Create {totalAssignmentsToCreate} Assignment{totalAssignmentsToCreate !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}