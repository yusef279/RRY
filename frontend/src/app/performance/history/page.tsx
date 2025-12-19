'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  FileText, 
  Download, 
  Archive, 
  BarChart3, 
  RefreshCw, 
  Search, 
  Building,
  TrendingUp,
  LineChart,
  Calendar
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// TypeScript interfaces
interface EmployeeProfile {
  _id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  department?: {
    name: string;
    code: string;
  };
}

interface Cycle {
  _id: string;
  name: string;
  startDate?: string;
}

interface Template {
  _id: string;
  name: string;
}

interface AppraisalRecord {
  _id: string;
  employeeProfileId: EmployeeProfile;
  managerProfileId: EmployeeProfile;
  cycleId: Cycle;
  templateId: Template;
  totalScore: number;
  overallRatingLabel: string;
  status: string;
  hrPublishedAt: string;
  employeeAcknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TrendCycle {
  id: string;
  name: string;
  records: AppraisalRecord[];
  year: number;
}

interface TrendDataCycle {
  cycleId: string;
  cycleName: string;
  year: number;
  totalAppraisals: number;
  averageScore: number;
  ratingDistribution: {
    outstanding: number;
    exceeds: number;
    meets: number;
    needsImprovement: number;
    unsatisfactory: number;
  };
  departmentBreakdown: Record<string, { count: number; avgScore: number }>;
  completionRate: number;
}

interface TrendData {
  cycles: TrendDataCycle[];
  overall: {
    totalRecords: number;
    averageScore: number;
    completionRate: number;
  };
}

export default function SystemAdminArchivePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AppraisalRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('records');
  const [trendData, setTrendData] = useState<TrendData | null>(null);

  // Check authorization
  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    
    if (!currentUser || currentUser.role !== 'System Admin') {
      router.replace('/dashboard');
      return;
    }
    
    setAuthorized(true);
  }, [router]);

  // Load records
  const loadRecords = async () => {
    try {
      setLoading(true);
      
      // Fetch published records
      const response = await api.get('/performance/records', {
        params: { status: 'HR_PUBLISHED' }
      });
      
      const fetchedRecords: AppraisalRecord[] = response.data || [];
      setRecords(fetchedRecords);
      
      // Generate trend data
      generateTrendData(fetchedRecords);
      
    } catch (error) {
      console.error('Failed to load records:', error);
      toast.error('Failed to load records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Generate multi-cycle trend data with proper typing
  const generateTrendData = (records: AppraisalRecord[]) => {
    if (!records.length) return;

    // Group by cycle
const cycleGroups = records.reduce((groups: Record<string, TrendCycle>, record) => {
    // Handle both populated and unpopulated cycleId
    const cycleId = record.cycleId?._id || (typeof record.cycleId === 'string' ? record.cycleId : 'unknown');
    const cycleName = record.cycleId?.name || (typeof record.cycleId === 'string' ? `Cycle ${record.cycleId}` : 'Unknown Cycle');
    
    if (!groups[cycleId]) {
      groups[cycleId] = {
        id: cycleId,
        name: cycleName,
        records: [],
        year: record.cycleId?.startDate ? new Date(record.cycleId.startDate).getFullYear() : new Date().getFullYear()
      };
    }
    groups[cycleId].records.push(record);
    return groups;
  }, {});
    // Calculate trends for each cycle with proper typing
    const cycleTrends: TrendDataCycle[] = Object.values(cycleGroups).map((group: TrendCycle) => {
      const scores: number[] = group.records.map((r: AppraisalRecord) => r.totalScore || 0);
      const avgScore: number = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
      
      // Rating distribution
      const ratingDist = {
        outstanding: group.records.filter((r: AppraisalRecord) => r.overallRatingLabel?.includes('Outstanding')).length,
        exceeds: group.records.filter((r: AppraisalRecord) => r.overallRatingLabel?.includes('Exceeds')).length,
        meets: group.records.filter((r: AppraisalRecord) => r.overallRatingLabel?.includes('Meets')).length,
        needsImprovement: group.records.filter((r: AppraisalRecord) => r.overallRatingLabel?.includes('Needs')).length,
        unsatisfactory: group.records.filter((r: AppraisalRecord) => r.overallRatingLabel?.includes('Unsatisfactory')).length,
      };

      // Department breakdown with proper typing
      const deptBreakdown = group.records.reduce((depts: Record<string, { count: number; avgScore: number }>, record: AppraisalRecord) => {
        const dept = record.employeeProfileId?.department?.name || 'Unknown';
        if (!depts[dept]) depts[dept] = { count: 0, avgScore: 0 };
        depts[dept].count++;
        const currentAvg = depts[dept].avgScore;
        depts[dept].avgScore = (currentAvg * (depts[dept].count - 1) + (record.totalScore || 0)) / depts[dept].count;
        return depts;
      }, {});

      return {
        cycleId: group.id,
        cycleName: group.name,
        year: group.year,
        totalAppraisals: group.records.length,
        averageScore: avgScore,
        ratingDistribution: ratingDist,
        departmentBreakdown: deptBreakdown,
        completionRate: (group.records.filter((r: AppraisalRecord) => r.employeeAcknowledgedAt).length / group.records.length) * 100
      };
    });

    setTrendData({
      cycles: cycleTrends.sort((a, b) => a.year - b.year),
      overall: {
        totalRecords: records.length,
        averageScore: records.reduce((sum: number, r: AppraisalRecord) => sum + (r.totalScore || 0), 0) / records.length,
        completionRate: (records.filter((r: AppraisalRecord) => r.employeeAcknowledgedAt).length / records.length) * 100
      }
    });
  };

  useEffect(() => {
    if (authorized) {
      loadRecords();
    }
  }, [authorized]);

  // Filter records
  const filteredRecords = records.filter((record: AppraisalRecord) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const employeeName = `${record.employeeProfileId?.firstName || ''} ${record.employeeProfileId?.lastName || ''}`.toLowerCase();
    const employeeNumber = String(record.employeeProfileId?.employeeNumber || '').toLowerCase();
    
    return employeeName.includes(query) || employeeNumber.includes(query);
  });

  // Chart data for trends with proper typing and null checks
  const scoreTrendData = {
    labels: trendData?.cycles.map((c: TrendDataCycle) => c.cycleName) || [],
    datasets: [
      {
        label: 'Average Score',
        data: trendData?.cycles.map((c: TrendDataCycle) => c.averageScore) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      }
    ]
  };

  const ratingDistributionData = {
    labels: ['Outstanding', 'Exceeds', 'Meets', 'Needs Improvement', 'Unsatisfactory'],
    datasets: trendData && trendData.cycles.length > 0 ? [{
      data: [
        trendData.cycles.reduce((sum: number, c: TrendDataCycle) => sum + c.ratingDistribution.outstanding, 0),
        trendData.cycles.reduce((sum: number, c: TrendDataCycle) => sum + c.ratingDistribution.exceeds, 0),
        trendData.cycles.reduce((sum: number, c: TrendDataCycle) => sum + c.ratingDistribution.meets, 0),
        trendData.cycles.reduce((sum: number, c: TrendDataCycle) => sum + c.ratingDistribution.needsImprovement, 0),
        trendData.cycles.reduce((sum: number, c: TrendDataCycle) => sum + c.ratingDistribution.unsatisfactory, 0),
      ],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(156, 163, 175, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)',
      ],
    }] : []
  };

  // PDF Export function with proper typing
  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF();
      
      // Title page
      pdf.setFontSize(20);
      pdf.text('Appraisal Archive Report', 20, 30);
      
      pdf.setFontSize(12);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
      pdf.text(`Total Records: ${records.length}`, 20, 55);
      pdf.text(`Average Score: ${trendData?.overall.averageScore.toFixed(1) || '0.0'}`, 20, 65);
      pdf.text(`Completion Rate: ${trendData?.overall.completionRate.toFixed(1) || '0.0'}%`, 20, 75);
      
      // Summary section
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text('Executive Summary', 20, 30);
      
      pdf.setFontSize(12);
      let yPosition = 45;
      
      if (trendData && trendData.cycles.length > 0) {
        trendData.cycles.forEach((cycle: TrendDataCycle) => {
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 30;
          }
          pdf.text(`${cycle.cycleName} (${cycle.year}):`, 20, yPosition);
          pdf.text(`• Total Appraisals: ${cycle.totalAppraisals}`, 25, yPosition + 8);
          pdf.text(`• Average Score: ${cycle.averageScore.toFixed(1)}`, 25, yPosition + 16);
          pdf.text(`• Completion Rate: ${cycle.completionRate.toFixed(1)}%`, 25, yPosition + 24);
          yPosition += 35;
        });
      }
      
      // Save the PDF
      pdf.save(`appraisal-archive-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exported successfully');
      
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('Failed to export PDF');
    }
  };

  // CSV Export function with proper typing
  const exportToCSV = () => {
    const csvData = filteredRecords.map((record: AppraisalRecord) => ({
      'Employee Name': `${record.employeeProfileId?.firstName || ''} ${record.employeeProfileId?.lastName || ''}`.trim(),
      'Employee Number': record.employeeProfileId?.employeeNumber || '',
      'Department': record.employeeProfileId?.department?.name || 'N/A',
      'Department Code': record.employeeProfileId?.department?.code || '',
      'Score': record.totalScore || 0,
      'Rating': record.overallRatingLabel || 'N/A',
      'Published Date': record.hrPublishedAt ? new Date(record.hrPublishedAt).toLocaleDateString() : 'N/A',
      'Status': record.employeeAcknowledgedAt ? 'Completed' : 'Published'
    }));

    const headers = Object.keys(csvData[0] || {});
    const csv = [
      headers.join(','),
      ...csvData.map((row: any) => headers.map((header: string) => `"${row[header as keyof typeof row] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `appraisal-archive-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  if (!authorized) {
    return (
      <AppShell title="Loading...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Appraisal Archive" allowedRoles={['System Admin']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Appraisal Archive</h1>
            <p className="text-gray-600">View trends and export appraisal data</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={loadRecords} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={exportToCSV} disabled={filteredRecords.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={exportToPDF} disabled={filteredRecords.length === 0} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Tabs with defaultValue to fix TypeScript error */}
        <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="records">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="records">Archive Records</TabsTrigger>
            <TabsTrigger value="trends">Multi-Cycle Trends</TabsTrigger>
          </TabsList>

          {/* Records Tab */}
          <TabsContent value="records" className="space-y-6">
            {/* Search */}
            <Card>
              <CardHeader>
                <CardTitle>Search Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by employee name or number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Showing {filteredRecords.length} of {records.length} records
                </p>
              </CardContent>
            </Card>

            {/* Records Table */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading records...</p>
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="p-12 text-center">
                    <Archive className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {records.length === 0 ? 'No published appraisals found' : 'No matching records'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Rating</TableHead>
                          <TableHead>Published</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.map((record: AppraisalRecord) => (
                          <TableRow key={record._id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {record.employeeProfileId?.firstName} {record.employeeProfileId?.lastName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {record.employeeProfileId?.employeeNumber}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building className="h-3 w-3 text-gray-400" />
                                <span>{record.employeeProfileId?.department?.name || 'No Department'}</span>
                                {record.employeeProfileId?.department?.code && (
                                  <span className="text-xs text-gray-500">({record.employeeProfileId.department.code})</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold">{record.totalScore?.toFixed(1) || '0.0'}</span>
                            </TableCell>
                            <TableCell>
                              {record.overallRatingLabel || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {record.hrPublishedAt 
                                ? new Date(record.hrPublishedAt).toLocaleDateString() 
                                : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {record.employeeAcknowledgedAt ? 'Completed' : 'Published'}
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

          {/* Trends Tab - with null checks */}
          <TabsContent value="trends" className="space-y-6">
            {trendData && trendData.cycles && trendData.cycles.length > 0 && (
              <>
                {/* Score Trend Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Score Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <Line data={scoreTrendData} options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'top' },
                          title: { display: true, text: 'Average Scores by Cycle' }
                        }
                      }} />
                    </div>
                  </CardContent>
                </Card>

                {/* Rating Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Rating Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <Doughnut data={ratingDistributionData} options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'right' }
                        }
                      }} />
                    </div>
                  </CardContent>
                </Card>

                {/* Cycle Details */}
                <div className="grid gap-4">
                  {trendData.cycles.map((cycle: TrendDataCycle) => (
                    <Card key={cycle.cycleId}>
                      <CardHeader>
                        <CardTitle className="text-lg">{cycle.cycleName} ({cycle.year})</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Appraisals</p>
                          <p className="text-xl font-bold">{cycle.totalAppraisals}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Average Score</p>
                          <p className="text-xl font-bold">{cycle.averageScore.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Completion Rate</p>
                          <p className="text-xl font-bold">{cycle.completionRate.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Top Department</p>
                          <p className="text-xl font-bold">
                            {Object.entries(cycle.departmentBreakdown)
                              .sort(([,a]: [string, any], [,b]: [string, any]) => b.avgScore - a.avgScore)[0]?.[0] || 'N/A'}
                          </p>
                        </div>
                      </CardContent>
                      <CardContent>
                        <p className="text-sm font-medium mb-2">Department Breakdown:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {Object.entries(cycle.departmentBreakdown).map(([dept, data]: [string, any]) => (
                            <div key={dept} className="flex justify-between">
                              <span>{dept}</span>
                              <span>{data.count} appraisals, avg: {data.avgScore.toFixed(1)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
            
            {!trendData && (
              <Card>
                <CardContent className="p-12 text-center">
                  <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No trend data available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}