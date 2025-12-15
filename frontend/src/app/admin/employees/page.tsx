"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Download, Eye } from "lucide-react";
import { exportEmployees } from "@/lib/export";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type EmployeeStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "ON_LEAVE"
  | "SUSPENDED"
  | "RETIRED"
  | "PROBATION"
  | "TERMINATED";

type EmployeeListItem = {
  _id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  systemRoles?: string[];
  status?: EmployeeStatus;
  departmentName?: string;
  positionTitle?: string;
  workEmail?: string;
  profilePictureUrl?: string;
};

const STATUS_OPTIONS: (EmployeeStatus | "ALL")[] = [
  "ALL",
  "ACTIVE",
  "INACTIVE",
  "ON_LEAVE",
  "SUSPENDED",
  "PROBATION",
  "RETIRED",
  "TERMINATED",
];

export default function AdminEmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "ALL">(
    "ALL",
  );

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await api.get("/employee-profile/admin/search", {
          params: { q: "" },
        });
        setEmployees(res.data || []);
      } catch (error: any) {
        console.error(error);
        toast.error(
          error?.response?.data?.message || "Failed to load employees.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        !search ||
        emp.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        emp.lastName?.toLowerCase().includes(search.toLowerCase()) ||
        emp.employeeNumber?.toLowerCase().includes(search.toLowerCase()) ||
        emp.workEmail?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        !emp.status ||
        emp.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [employees, search, statusFilter]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
  };

  const handleExport = (format: 'csv' | 'excel') => {
    if (filteredEmployees.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportEmployees(filteredEmployees, format);
    toast.success(`Exported ${filteredEmployees.length} employees to ${format.toUpperCase()}`);
  };

  return (
    <AppShell
      title="Employees"
      subtitle="Browse and manage all employees in the HR system."
      allowedRoles={["HR Admin", "System Admin"]}
    >
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Employee directory</CardTitle>
            <CardDescription>
              Search employees and view their basic information.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input
              placeholder="Search by name, employee #, or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-72"
            />
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as EmployeeStatus | "ALL")
                }
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "ALL" ? "All statuses" : s.replace("_", " ")}
                  </option>
                ))}
              </select>
              <Button variant="outline" onClick={resetFilters}>
                Reset
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('csv')}
                disabled={loading || filteredEmployees.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading employees…</p>
          ) : filteredEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No employees found with the current filters.
            </p>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Employee #</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>System roles</TableHead>
                    <TableHead>Work email</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => (
                    <TableRow key={emp._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage
                              src={
                                emp.profilePictureUrl
                                  ? emp.profilePictureUrl.startsWith("http")
                                    ? emp.profilePictureUrl
                                    : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}${emp.profilePictureUrl}`
                                  : ""
                              }
                            />
                            <AvatarFallback>
                              {(emp.firstName?.[0] || "").toUpperCase()}
                              {(emp.lastName?.[0] || "").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {emp.firstName} {emp.lastName}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{emp.employeeNumber}</TableCell>
                      <TableCell>{emp.departmentName || "—"}</TableCell>
                      <TableCell>{emp.positionTitle || "—"}</TableCell>
                      <TableCell>
                        {emp.status ? (
                          <Badge variant="secondary" className="uppercase">
                            {emp.status}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {(emp.systemRoles?.length ?? 0) > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {emp.systemRoles!.map((r) => (
                              <Badge
                                key={r}
                                variant="outline"
                                className="text-[11px] uppercase"
                              >
                                {r}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            None
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{emp.workEmail || "—"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/employees/${emp._id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
