
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  FileText, 
  Download, 
  Archive, 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Filter, 
  Search, 
  Users, 
  Building, 
  PieChart,
  History,
  FileSpreadsheet,
  BarChart,
  LineChart,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  Shield,
  RefreshCw,
  DownloadCloud,
  Database,
  TrendingDown,
  Target,
  Activity
} from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';

type AppraisalArchiveRecord = {
  _id: string;
  originalRecordId: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    department?: {
      name: string;
      code: string;
    };
    position?: {
      title: string;
      grade: string;
    };
  };
  cycleId?: {
    _id: string;
    name: string;
    year: number;
    quarter?: number;
    startDate?: string;
    endDate?: string;
  };
  templateId?: {
    _id: string;
    name: string;
    version: string;
  };
  totalScore: number;
  overallRatingLabel: string;
  managerProfileId?: {
    firstName: string;
    lastName: string;
    role: string;
  };
  status: string;
  hrPublishedAt: string;
  employeeAcknowledgedAt: string | null;
  archivedAt: string;
  disputeCount: number;
  hrAdjusted: boolean;
  finalStatus: 'completed' | 'disputed' | 'adjusted' | 'cancelled' | 'published';
  metadata?: {
    archiveVersion: number;
    dataHash: string;
    lastAccessed: string;
    accessCount: number;
  };
};

type TrendAnalysisData = {
  cycleId: string;
  cycleName: string;
  year: number;
  quarter?: number;
  totalAppraisals: number;
  averageScore: number;
  ratingDistribution: {
    outstanding: number;
    exceeds: number;
    meets: number;
    needsImprovement: number;
    unsatisfactory: number;
  };
  departmentBreakdown: Record<string, {
    count: number;
    avgScore: number;
  }>;
  disputeRate: number;
  adjustmentRate: number;
  completionRate: number;
};

type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

export default function SystemAdminArchivePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authorized, setAuthorized] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [cycleFilter, setCycleFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departments, setDepartments] = useState<string[]>([]);
  const [cycles, setCycles] = useState<{ _id: string; name: string; year: number }[]>([]);
  
  const [archivedRecords, setArchivedRecords] = useState<AppraisalArchiveRecord[]>([]);
  const [trendData, setTrendData] = useState<TrendAnalysisData[]>([]);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
  const [exportIncludeDetails, setExportIncludeDetails] = useState(true);
  const [exportIncludeTrends, setExportIncludeTrends] = useState(false);
  const [activeTab, setActiveTab] = useState('records');
  const [expandedCycles, setExpandedCycles] = useState<string[]>([]);
  const [isAutoArchiving, setIsAutoArchiving] = useState(true);

  // Initialize user and authorization ONCE
  useEffect(() => {
    if (initialized) return;
    
    const currentUser = getCurrentUser();
    setUser(currentUser);
    
    if (!currentUser) {
      console.log('No user found, redirecting to login');
      router.replace('/login');
      return;
    }
    
    if (currentUser.role !== 'System Admin') {
      console.log('User is not System Admin, redirecting to dashboard');
      toast.error('Access Denied: System Admin privileges required');
      router.replace('/dashboard');
      return;
    }
    
    console.log('User authorized as System Admin');
    setAuthorized(true);
    setInitialized(true);
  }, [router, initialized]);

  // Load data ONLY when authorized
  const loadData = async () => {
    if (!authorized) return;
    
    try {
      setLoading(true);
      
      // Load published records (these are essentially archived)
      const recordsRes = await api.get('/performance/records', {
        params: { status: 'HR_PUBLISHED' }
      });
      const records: any[] = recordsRes.data || [];
      
      // Transform to archive format
      const archiveRecords = records.map((record: any) => ({
        ...record,
        originalRecordId: record._id,
        archivedAt: record.employeeAcknowledgedAt || record.hrPublishedAt || new Date().toISOString(),
        disputeCount: 0,
        hrAdjusted: false,
        finalStatus: record.employeeAcknowledgedAt ? 'completed' : 'published',
        metadata: {
          archiveVersion: 1,
          dataHash: `hash_${record._id}`,
          lastAccessed: new Date().toISOString(),
          accessCount: 0
        }
      }));
      
      setArchivedRecords(archiveRecords);

      // Extract unique departments for filters
      const deptSet = new Set<string>();
      archiveRecords.forEach((record: any) => {
        if (record.employeeId?.department?.name && typeof record.employeeId.department.name === 'string') {
          deptSet.add(record.employeeId.department.name);
        }
      });
      const uniqueDepts = Array.from(deptSet);
      setDepartments(['all', ...uniqueDepts]);

      // Extract unique cycles for filters
      const cycleSet = new Map<string, { _id: string; name: string; year: number }>();
      archiveRecords.forEach((record: any) => {
        if (record.cycleId && record.cycleId._id && record.cycleId.name) {
          const year = record.cycleId.startDate 
            ? new Date(record.cycleId.startDate).getFullYear()
            : new Date().getFullYear();
          
          if (!cycleSet.has(record.cycleId._id)) {
            cycleSet.set(record.cycleId._id, {
              _id: record.cycleId._id,
              name: record.cycleId.name,
              year: year
            });
          }
        }
      });
      const uniqueCycles = Array.from(cycleSet.values());
      setCycles([{ _id: 'all', name: 'All Cycles', year: 0 }, ...uniqueCycles]);

      // Load trend analysis data (simulate for now)
      const mockTrendData = generateMockTrendData();
      setTrendData(mockTrendData);

    } catch (error) {
      console.error('Failed to load archive data:', error);
      toast.error('Failed to load archive data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount when authorized
  useEffect(() => {
    if (authorized && initialized) {
      loadData();
    }
  }, [authorized, initialized]);

  // Generate mock trend data for demonstration
  const generateMockTrendData = (): TrendAnalysisData[] => {
    const years = [2023, 2024, 2025];
    const quarters = [1, 2, 3, 4];
    
    return years.flatMap(year => 
      quarters.map(quarter => ({
        cycleId: `cycle_${year}_q${quarter}`,
        cycleName: `${year} Q${quarter}`,
        year,
        quarter,
        totalAppraisals: Math.floor(Math.random() * 100) + 50,
        averageScore: Math.random() * 20 + 70,
        ratingDistribution: {
          outstanding: Math.floor(Math.random() * 20),
          exceeds: Math.floor(Math.random() * 30),
          meets: Math.floor(Math.random() * 40),
          needsImprovement: Math.floor(Math.random() * 10),
          unsatisfactory: Math.floor(Math.random() * 5)
        },
        departmentBreakdown: {
          'Engineering': { count: 30, avgScore: 85 },
          'Sales': { count: 25, avgScore: 78 },
          'Marketing': { count: 15, avgScore: 82 },
          'HR': { count: 10, avgScore: 88 },
          'Finance': { count: 8, avgScore: 90 }
        },
        disputeRate: Math.random() * 15,
        adjustmentRate: Math.random() * 10,
        completionRate: Math.random() * 20 + 80
      }))
    );
  };

  // Filter records based on criteria
  const filteredRecords = archivedRecords.filter(record => {
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      
      // Safe access with fallbacks
      const employeeName = `${record.employeeId?.firstName || ''} ${record.employeeId?.lastName || ''}`.toLowerCase();
      const employeeNumber = String(record.employeeId?.employeeNumber || '').toLowerCase();
      const cycleName = String(record.cycleId?.name || '').toLowerCase();
      const departmentName = String(record.employeeId?.department?.name || '').toLowerCase();
      
      const matchesSearch = 
        employeeName.includes(query) ||
        employeeNumber.includes(query) ||
        cycleName.includes(query) ||
        departmentName.includes(query);
      
      if (!matchesSearch) return false;
    }

    // Department filter - safe comparison
    if (departmentFilter !== 'all') {
      const recordDeptName = record.employeeId?.department?.name || '';
      if (recordDeptName !== departmentFilter) {
        return false;
      }
    }

    // Cycle filter - safe comparison
    if (cycleFilter !== 'all') {
      const recordCycleId = record.cycleId?._id || '';
      if (recordCycleId !== cycleFilter) {
        return false;
      }
    }

    // Rating filter - safe comparison
    if (ratingFilter !== 'all') {
      const ratingMap: Record<string, string[]> = {
        'outstanding': ['Outstanding', 'Exceptional'],
        'exceeds': ['Exceeds Expectations', 'Above Average'],
        'meets': ['Meets Expectations', 'Average', 'Competent'],
        'needs-improvement': ['Needs Improvement', 'Below Average'],
        'unsatisfactory': ['Unsatisfactory', 'Poor']
      };
      
      const recordRating = record.overallRatingLabel || '';
      if (ratingFilter in ratingMap && !ratingMap[ratingFilter].includes(recordRating)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      const recordStatus = record.finalStatus;
      if (recordStatus !== statusFilter) {
        return false;
      }
    }

    return true;
  });

  // Handle export
  const handleExport = async () => {
    try {
      setExporting(true);
      
      // Prepare export data
      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: user?.firstName || 'System Admin',
          format: exportFormat,
          recordCount: filteredRecords.length
        },
        data: filteredRecords,
        trends: exportIncludeTrends ? trendData : undefined
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `appraisal-archive-${timestamp}.${
        exportFormat === 'csv' ? 'csv' :
        exportFormat === 'excel' ? 'xlsx' :
        exportFormat === 'pdf' ? 'pdf' : 'json'
      }`;
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Export completed: ${fileName}`);
      setShowExportDialog(false);
      
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  // Toggle cycle expansion in trend view
  const toggleCycleExpansion = (cycleId: string) => {
    setExpandedCycles(prev =>
      prev.includes(cycleId)
        ? prev.filter(id => id !== cycleId)
        : [...prev, cycleId]
    );
  };

  // Calculate overall statistics
  const overallStats = {
    totalArchived: archivedRecords.length,
    averageScore: archivedRecords.length > 0 
      ? archivedRecords.reduce((sum, r) => sum + r.totalScore, 0) / archivedRecords.length 
      : 0,
    disputeRate: archivedRecords.length > 0
      ? (archivedRecords.filter(r => r.disputeCount > 0).length / archivedRecords.length) * 100
      : 0,
    adjustmentRate: archivedRecords.length > 0
      ? (archivedRecords.filter(r => r.hrAdjusted).length / archivedRecords.length) * 100
      : 0,
    completionRate: archivedRecords.length > 0
      ? (archivedRecords.filter(r => r.employeeAcknowledgedAt).length / archivedRecords.length) * 100
      : 0,
  };

  // Get rating badge color
  const getRatingBadge = (rating: string) => {
    const ratingColors: Record<string, string> = {
      'Outstanding': 'bg-green-100 text-green-800 border-green-200',
      'Exceptional': 'bg-green-100 text-green-800 border-green-200',
      'Exceeds Expectations': 'bg-blue-100 text-blue-800 border-blue-200',
      'Above Average': 'bg-blue-100 text-blue-800 border-blue-200',
      'Meets Expectations': 'bg-gray-100 text-gray-800 border-gray-200',
      'Average': 'bg-gray-100 text-gray-800 border-gray-200',
      'Competent': 'bg-gray-100 text-gray-800 border-gray-200',
      'Needs Improvement': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Below Average': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Unsatisfactory': 'bg-red-100 text-red-800 border-red-200',
      'Poor': 'bg-red-100 text-red-800 border-red-200',
    };
    
    return ratingColors[rating] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Get status badge
  const getStatusBadge = (record: AppraisalArchiveRecord) => {
    if (record.finalStatus === 'completed') {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
    } else if (record.finalStatus === 'adjusted') {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200">HR Adjusted</Badge>;
    } else if (record.finalStatus === 'disputed') {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Disputed</Badge>;
    } else if (record.finalStatus === 'published') {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Published</Badge>;
    } else {
      return <Badge variant="outline">Cancelled</Badge>;
    }
  };

  // Handle auto-archive toggle
  const handleToggleAutoArchive = async () => {
    setIsAutoArchiving(!isAutoArchiving);
    toast.success(`Auto-archiving ${!isAutoArchiving ? 'enabled' : 'disabled'}`);
  };

  // Handle manual archive
  const handleManualArchive = async () => {
    try {
      toast.loading('Archiving completed appraisals...');
      // You would call your backend archive endpoint here
      // await api.post('/performance/archive/process');
      setTimeout(() => {
        toast.success('Archival process completed');
        loadData();
      }, 1500);
    } catch (error) {
      toast.error('Archive process failed');
    }
  };
 if (!initialized || (initialized && !authorized)) {
    return (
      <AppShell title="Loading...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppShell>
    );
  }

  // Only render main content if authorized
  return (
    <AppShell title="Archived Appraisals - System Admin" allowedRoles={['System Admin']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appraisal Archive & Analysis</h1>
            <p className="text-gray-600">
              Historical appraisal data archive, trend analysis, and reporting
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded">
              {archivedRecords.filter(r => !r.employeeAcknowledgedAt).length} pending
            </div>
            <Button 
              variant="outline" 
              onClick={loadData}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={() => setShowExportDialog(true)}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Archived</p>
                  <p className="text-2xl font-bold">{overallStats.totalArchived}</p>
                </div>
                <Archive className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Score</p>
                  <p className="text-2xl font-bold">{overallStats.averageScore.toFixed(1)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Dispute Rate</p>
                  <p className="text-2xl font-bold">{overallStats.disputeRate.toFixed(1)}%</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold">{overallStats.completionRate.toFixed(1)}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Archive Management */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="h-5 w-5 text-gray-400" />
                  <h3 className="font-medium">Archive Management</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Manage appraisal data archival and retention policies
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={isAutoArchiving}
                    onCheckedChange={handleToggleAutoArchive}
                  />
                  <Label>Auto-archive completed appraisals</Label>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleManualArchive}
                  className="gap-2"
                >
                  <Archive className="h-4 w-4" />
                  Run Manual Archive
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="records" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="records">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Archive Records
              </div>
            </TabsTrigger>
            <TabsTrigger value="trends">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trend Analysis
              </div>
            </TabsTrigger>
            <TabsTrigger value="reports">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Reports
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Archive Records Tab */}
          <TabsContent value="records" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Filter Archive Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <Label className="text-xs">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Employee, Department, Cycle..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Department</Label>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>
                            {dept === 'all' ? 'All Departments' : dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Appraisal Cycle</Label>
                    <Select value={cycleFilter} onValueChange={setCycleFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Cycles" />
                      </SelectTrigger>
                      <SelectContent>
                        {cycles.map(cycle => (
                          <SelectItem key={cycle._id} value={cycle._id}>
                            {cycle.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Rating</Label>
                    <Select value={ratingFilter} onValueChange={setRatingFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Ratings" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ratings</SelectItem>
                        <SelectItem value="outstanding">Outstanding</SelectItem>
                        <SelectItem value="exceeds">Exceeds Expectations</SelectItem>
                        <SelectItem value="meets">Meets Expectations</SelectItem>
                        <SelectItem value="needs-improvement">Needs Improvement</SelectItem>
                        <SelectItem value="unsatisfactory">Unsatisfactory</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="adjusted">HR Adjusted</SelectItem>
                        <SelectItem value="disputed">Disputed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {filteredRecords.length} of {archivedRecords.length} records
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRecords(filteredRecords.map(r => r._id));
                        } else {
                          setSelectedRecords([]);
                        }
                      }}
                    />
                    <Label className="text-sm">Select all</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Records Table */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="p-12 text-center">
                    <Archive className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No archived records found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRecords(filteredRecords.map(r => r._id));
                                } else {
                                  setSelectedRecords([]);
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>Employee</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Appraisal Cycle</TableHead>
                          <TableHead>Score/Rating</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Archived</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.map((record) => (
                          <TableRow key={record._id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedRecords.includes(record._id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedRecords([...selectedRecords, record._id]);
                                  } else {
                                    setSelectedRecords(selectedRecords.filter(id => id !== record._id));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {record.employeeId?.firstName} {record.employeeId?.lastName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {record.employeeId?.employeeNumber}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {record.employeeId?.position?.title || 'N/A'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building className="h-3 w-3 text-gray-400" />
                                <span>{record.employeeId?.department?.name || 'N/A'}</span>
                                <Badge variant="outline" className="text-xs">
                                  {record.employeeId?.department?.code || ''}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{record.cycleId?.name || 'N/A'}</p>
                                <p className="text-xs text-gray-500">
                                  {record.cycleId?.startDate ? new Date(record.cycleId.startDate).getFullYear() : ''}
                                  {record.cycleId?.quarter && ` - Q${record.cycleId.quarter}`}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">{record.totalScore.toFixed(1)}</span>
                                  {record.hrAdjusted && (
                                    <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                                      HR Adjusted
                                    </Badge>
                                  )}
                                </div>
                                <Badge className={`text-xs ${getRatingBadge(record.overallRatingLabel)}`}>
                                  {record.overallRatingLabel}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {getStatusBadge(record)}
                                {record.disputeCount > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {record.disputeCount} dispute{record.disputeCount !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(record.archivedAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                v{record.metadata?.archiveVersion || 1}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Navigate to record detail view
                                    router.push(`/admin/archives/${record._id}`);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
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
          </TabsContent>

          {/* Trend Analysis Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Multi-Cycle Performance Trends</CardTitle>
                <CardDescription>
                  Historical analysis of appraisal outcomes across evaluation cycles
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : trendData.length === 0 ? (
                  <div className="p-12 text-center">
                    <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No trend data available</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary Chart Placeholder */}
                    <div className="p-6 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Performance Score Trend (2019-2024)</h3>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <div className="flex items-center">
                              <LineChart className="h-4 w-4 mr-2" />
                              Line Chart
                            </div>
                          </Button>
                          <Button variant="outline" size="sm">
                            <div className="flex items-center">
                              <BarChart className="h-4 w-4 mr-2" />
                              Bar Chart
                            </div>
                          </Button>
                        </div>
                      </div>
                      <div className="h-64 flex items-center justify-center text-gray-500">
                        {/* Mock Chart */}
                        <div className="w-full h-full flex flex-col justify-end">
                          <div className="flex items-end h-48 space-x-4 px-4">
                            {[2019, 2020, 2021, 2022, 2023, 2024].map(year => (
                              <div key={year} className="flex flex-col items-center">
                                <div 
                                  className="w-12 bg-blue-500 rounded-t-lg"
                                  style={{ height: `${Math.random() * 100}%` }}
                                />
                                <div className="mt-2 text-xs text-gray-600">{year}</div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 text-center text-sm text-gray-600">
                            Yearly Average Performance Scores
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Performance Improvement</p>
                              <p className="text-2xl font-bold text-green-600">+12.5%</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-400" />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">vs previous year</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Dispute Rate Trend</p>
                              <p className="text-2xl font-bold text-red-600">-3.2%</p>
                            </div>
                            <TrendingDown className="h-8 w-8 text-red-400" />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">reduction year-over-year</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Target Achievement</p>
                              <p className="text-2xl font-bold text-blue-600">86.4%</p>
                            </div>
                            <Target className="h-8 w-8 text-blue-400" />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">meets or exceeds expectations</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Cycle Breakdown */}
                    <div className="space-y-4">
                      <h3 className="font-semibold">Cycle-by-Cycle Analysis</h3>
                      {trendData.slice(0, 6).map((cycle) => (
                        <div key={cycle.cycleId} className="border rounded-lg overflow-hidden">
                          <div 
                            className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                            onClick={() => toggleCycleExpansion(cycle.cycleId)}
                          >
                            <div className="flex items-center gap-4">
                              <div>
                                {expandedCycles.includes(cycle.cycleId) ? (
                                  <ChevronUp className="h-5 w-5 text-gray-500" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-gray-500" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-medium">{cycle.cycleName}</h4>
                                <p className="text-sm text-gray-600">
                                  {cycle.year} {cycle.quarter && `• Q${cycle.quarter}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="text-sm text-gray-600">Avg Score</p>
                                <p className="text-lg font-bold">{cycle.averageScore.toFixed(1)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">Appraisals</p>
                                <p className="text-lg font-bold">{cycle.totalAppraisals}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">Dispute Rate</p>
                                <p className="text-lg font-bold">{cycle.disputeRate.toFixed(1)}%</p>
                              </div>
                            </div>
                          </div>
                          
                          {expandedCycles.includes(cycle.cycleId) && (
                            <div className="p-4 border-t bg-white">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Rating Distribution */}
                                <div>
                                  <h5 className="font-medium mb-3">Rating Distribution</h5>
                                  <div className="space-y-2">
                                    {Object.entries(cycle.ratingDistribution).map(([rating, count]) => (
                                      <div key={rating} className="flex items-center justify-between">
                                        <span className="text-sm capitalize">{rating.replace(/([A-Z])/g, ' $1').trim()}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{count}</span>
                                          <div className="w-32 bg-gray-200 rounded-full h-2">
                                            <div 
                                              className="bg-blue-600 h-2 rounded-full"
                                              style={{ width: `${(count / cycle.totalAppraisals) * 100}%` }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                {/* Department Breakdown */}
                                <div>
                                  <h5 className="font-medium mb-3">Department Performance</h5>
                                  <div className="space-y-2">
                                    {Object.entries(cycle.departmentBreakdown)
                                      .slice(0, 5)
                                      .map(([dept, data]) => (
                                        <div key={dept} className="flex items-center justify-between">
                                          <span className="text-sm truncate max-w-[100px]">{dept}</span>
                                          <div className="flex items-center gap-3">
                                            <span className="text-sm text-gray-600">{data.count} appraisals</span>
                                            <Badge variant="outline">{data.avgScore.toFixed(1)}</Badge>
                                          </div>
                                        </div>
                                      ))}
                                    {Object.keys(cycle.departmentBreakdown).length > 5 && (
                                      <p className="text-xs text-gray-500 mt-2">
                                        +{Object.keys(cycle.departmentBreakdown).length - 5} more departments
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Key Metrics */}
                                <div>
                                  <h5 className="font-medium mb-3">Key Metrics</h5>
                                  <div className="space-y-3">
                                    <div className="flex justify-between">
                                      <span className="text-sm">Completion Rate</span>
                                      <Badge className={cycle.completionRate >= 95 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                        {cycle.completionRate.toFixed(1)}%
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm">HR Adjustment Rate</span>
                                      <Badge className={cycle.adjustmentRate <= 5 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                                        {cycle.adjustmentRate.toFixed(1)}%
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm">Dispute Resolution</span>
                                      <Badge className={cycle.disputeRate <= 10 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                        {cycle.disputeRate.toFixed(1)}%
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Outcome Reports</CardTitle>
                <CardDescription>
                  Generate detailed reports for analysis, compliance, and decision-making
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Report Templates */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Department Performance Report
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Comprehensive analysis of performance across departments with comparative metrics.
                      </p>
                      <div className="text-xs text-gray-500 mb-2">Includes:</div>
                      <ul className="text-xs text-gray-600 space-y-1 mb-4">
                        <li>• Departmental average scores</li>
                        <li>• Rating distribution comparison</li>
                        <li>• Dispute and adjustment rates</li>
                        <li>• Year-over-year trends</li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full" onClick={() => {
                        setActiveTab('trends');
                        toast.info('Navigate to Trend Analysis for detailed reports');
                      }}>
                        Generate Report
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <PieChart className="h-4 w-4" />
                        Rating Distribution Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Statistical analysis of rating patterns across the organization.
                      </p>
                      <div className="text-xs text-gray-500 mb-2">Includes:</div>
                      <ul className="text-xs text-gray-600 space-y-1 mb-4">
                        <li>• Rating distribution charts</li>
                        <li>• Bell curve analysis</li>
                        <li>• Comparison against benchmarks</li>
                        <li>• Compliance with rating guidelines</li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full" onClick={() => setShowExportDialog(true)}>
                        Generate Report
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Dispute & Resolution Report
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Analysis of dispute patterns, resolution times, and HR intervention.
                      </p>
                      <div className="text-xs text-gray-500 mb-2">Includes:</div>
                      <ul className="text-xs text-gray-600 space-y-1 mb-4">
                        <li>• Dispute frequency and patterns</li>
                        <li>• Resolution time analysis</li>
                        <li>• HR adjustment impact</li>
                        <li>• Recurring issue identification</li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full" onClick={() => setShowExportDialog(true)}>
                        Generate Report
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Performance Trends Report
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Multi-year performance trend analysis with forecasting.
                      </p>
                      <div className="text-xs text-gray-500 mb-2">Includes:</div>
                      <ul className="text-xs text-gray-600 space-y-1 mb-4">
                        <li>• 3-year performance trends</li>
                        <li>• Departmental trend comparisons</li>
                        <li>• Forecast models</li>
                        <li>• Performance trajectory analysis</li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full" onClick={() => {
                        setActiveTab('trends');
                        toast.info('Navigate to Trend Analysis for detailed reports');
                      }}>
                        Generate Report
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Compliance Audit Report
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Compliance verification and audit trail for regulatory requirements.
                      </p>
                      <div className="text-xs text-gray-500 mb-2">Includes:</div>
                      <ul className="text-xs text-gray-600 space-y-1 mb-4">
                        <li>• Completion rate compliance</li>
                        <li>• Dispute resolution tracking</li>
                        <li>• HR intervention documentation</li>
                        <li>• Audit trail and timestamps</li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full" onClick={() => setShowExportDialog(true)}>
                        Generate Report
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Executive Summary Report
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        High-level summary for executive decision-making.
                      </p>
                      <div className="text-xs text-gray-500 mb-2">Includes:</div>
                      <ul className="text-xs text-gray-600 space-y-1 mb-4">
                        <li>• Key performance indicators</li>
                        <li>• Executive dashboard summary</li>
                        <li>• Actionable insights</li>
                        <li>• Strategic recommendations</li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full" onClick={() => setShowExportDialog(true)}>
                        Generate Report
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Export Dialog */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Export Archive Data</DialogTitle>
              <DialogDescription>
                Select export options for archived appraisal data
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label>Export Format</Label>
                <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                    <SelectItem value="pdf">PDF Report (.pdf)</SelectItem>
                    <SelectItem value="json">JSON Data (.json)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <Label>Content Options</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-details" 
                    checked={exportIncludeDetails}
                    onCheckedChange={(checked) => setExportIncludeDetails(checked as boolean)}
                  />
                  <Label htmlFor="include-details" className="text-sm font-normal">
                    Include detailed appraisal records
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-trends" 
                    checked={exportIncludeTrends}
                    onCheckedChange={(checked) => setExportIncludeTrends(checked as boolean)}
                  />
                  <Label htmlFor="include-trends" className="text-sm font-normal">
                    Include trend analysis data
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-metadata" 
                    checked={true}
                    onCheckedChange={() => {}}
                  />
                  <Label htmlFor="include-metadata" className="text-sm font-normal">
                    Include metadata and audit trail
                  </Label>
                </div>
              </div>
              
              {selectedRecords.length > 0 && (
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-blue-800">
                    Exporting {selectedRecords.length} selected record{selectedRecords.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
            
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowExportDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={exporting}
                className="gap-2"
              >
                {exporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <DownloadCloud className="h-4 w-4" />
                    Export Data
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}