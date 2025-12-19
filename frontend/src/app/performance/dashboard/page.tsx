'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { AppraisalCycleStatus } from '@/types/performance';

type Stat = { totalCycles: number; activeCycles: number; totalAssignments: number; submittedRecords: number; publishedRecords: number; openDisputes: number };
type Progress = { departmentName: string; total: number; completed: number; completionRate: number };

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stat | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/performance/dashboard/stats'),
      api.get('/performance/dashboard/department-progress'),
    ])
      .then(([s, p]) => {
        setStats(s.data);
        setProgress(Array.isArray(p.data) ? p.data : []);
      })
      .catch(() => {});
  }, []);

  if (!stats) return <p className="text-muted-foreground">Loading dashboard…</p>;

  return (
    <AppShell title="Performance Dashboard" allowedRoles={['HR Manager','HR Employee']}>
      {/* KPI CARDS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active cycles</CardTitle>
            <Badge variant="secondary">{stats.activeCycles}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCycles}</div>
            <p className="text-xs text-muted-foreground">of {stats.totalCycles} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssignments}</div>
            <p className="text-xs text-muted-foreground">{stats.publishedRecords} published</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending submission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssignments - stats.submittedRecords}</div>
            <p className="text-xs text-muted-foreground">{stats.submittedRecords} already submitted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open disputes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openDisputes}</div>
            <p className="text-xs text-muted-foreground">awaiting resolution</p>
          </CardContent>
        </Card>
      </div>

      {/* DEPARTMENT PROGRESS TABLE */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Department completion</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {progress.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No department data
                    </TableCell>
                  </TableRow>
                ) : (
                  progress.map((p) => (
                    <TableRow key={p.departmentName}>
                      <TableCell>{p.departmentName}</TableCell>
                      <TableCell className="text-right">{p.total}</TableCell>
                      <TableCell className="text-right">{p.completed}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          className={
                            p.completionRate >= 80
                              ? 'bg-green-100 text-green-800'
                              : p.completionRate >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {p.completionRate.toFixed(0)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* CHARTS */}
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Completion by department</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={progress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="departmentName" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completionRate" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overall status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Published', value: stats.publishedRecords },
                    { name: 'Submitted', value: stats.submittedRecords },
                    { name: 'Pending', value: stats.totalAssignments - stats.submittedRecords },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label
                >
                  {COLORS.map((c, i) => (
                    <Cell key={`cell-${i}`} fill={c} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}