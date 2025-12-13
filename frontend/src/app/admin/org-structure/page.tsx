"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, GitBranch } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { api } from "@/lib/api";
import { OrgTree } from "@/components/org-chart/org-tree";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DepartmentStatus = "ACTIVE" | "INACTIVE";

type Department = {
  _id?: string;
  name: string;
  code: string;
  status?: DepartmentStatus;
};

type PositionStatus = "ACTIVE" | "INACTIVE";

type Position = {
  _id?: string;
  name: string; // UI "Name" field (we map backend title -> this)
  code: string;
  departmentId: string;
  departmentName?: string;
  payGrade?: string;
  status?: PositionStatus;
};

// ---------- helpers ----------
const safeStr = (v: any) => (v === undefined || v === null ? "" : String(v));

const normalizeDepartment = (d: any): Department => {
  const status: DepartmentStatus | undefined =
    typeof d?.status === "string"
      ? d.status
      : typeof d?.isActive === "boolean"
        ? d.isActive
          ? "ACTIVE"
          : "INACTIVE"
        : undefined;

  return {
    _id: d?._id,
    name: safeStr(d?.name),
    code: safeStr(d?.code),
    status,
  };
};

const normalizePosition = (p: any): Position => {
  const status: PositionStatus | undefined =
    typeof p?.status === "string"
      ? p.status
      : typeof p?.isActive === "boolean"
        ? p.isActive
          ? "ACTIVE"
          : "INACTIVE"
        : undefined;

  // backend uses title; frontend uses name
  const name =
    safeStr(p?.title) || safeStr(p?.name) || ""; // IMPORTANT: don't fallback to code anymore

  return {
    _id: p?._id,
    name,
    code: safeStr(p?.code),
    departmentId: safeStr(p?.departmentId?._id ?? p?.departmentId),
    departmentName:
      safeStr(p?.departmentName ?? p?.department?.name) || undefined,
    payGrade:
      p?.payGrade !== undefined && p?.payGrade !== null
        ? String(p.payGrade)
        : undefined,
    status,
  };
};

export default function AdminOrgStructurePage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  const [deptForm, setDeptForm] = useState({ name: "", code: "" });
  const [positionForm, setPositionForm] = useState({
    name: "",
    code: "",
    departmentId: "",
    payGrade: "",
  });

  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingPos, setEditingPos] = useState<Position | null>(null);
  const [deactivatePosId, setDeactivatePosId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [deptRes, posRes] = await Promise.all([
          api.get("/organization-structure/departments"),
          api.get("/organization-structure/positions"),
        ]);

        const dep = Array.isArray(deptRes.data) ? deptRes.data : [];
        const pos = Array.isArray(posRes.data) ? posRes.data : [];

        setDepartments(dep.map(normalizeDepartment));
        setPositions(pos.map(normalizePosition));
      } catch (error: any) {
        console.error(error);
        toast.error(
          error?.response?.data?.message ||
            "Failed to load organization structure data.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const departmentMap = useMemo(() => {
    const map: Record<string, string> = {};
    departments.forEach((d) => {
      if (d._id) map[d._id] = d.name;
    });
    return map;
  }, [departments]);

  const handleCreateDepartment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await api.post("/organization-structure/departments", {
        name: deptForm.name,
        code: deptForm.code,
      });

      setDepartments((prev) => [...prev, normalizeDepartment(res.data)]);
      setDeptForm({ name: "", code: "" });
      toast.success("Department created.");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Unable to create department.",
      );
    }
  };

  const handleCreatePosition = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // ✅ SEND title (backend expects title)
      const res = await api.post("/organization-structure/positions", {
        title: positionForm.name, // <-- FIX
        code: positionForm.code,
        departmentId: positionForm.departmentId,
        payGrade: positionForm.payGrade || undefined,
      });

      setPositions((prev) => [...prev, normalizePosition(res.data)]);
      setPositionForm({
        name: "",
        code: "",
        departmentId: "",
        payGrade: "",
      });
      toast.success("Position created.");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Unable to create position.",
      );
    }
  };

  const handleSaveDepartment = async () => {
    if (!editingDept?._id) return;
    try {
      const res = await api.patch(
        `/organization-structure/departments/${editingDept._id}`,
        {
          name: editingDept.name,
          code: editingDept.code,
        },
      );

      const updated = normalizeDepartment(res.data);

      setDepartments((prev) =>
        prev.map((d) => (d._id === editingDept._id ? updated : d)),
      );
      setEditingDept(null);
      toast.success("Department updated.");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Unable to update department.",
      );
    }
  };

  const handleSavePosition = async () => {
    if (!editingPos?._id) return;
    try {
      // ✅ SEND title on update too
      const res = await api.patch(
        `/organization-structure/positions/${editingPos._id}`,
        {
          title: editingPos.name, // <-- FIX
          code: editingPos.code,
          departmentId: editingPos.departmentId,
          payGrade: editingPos.payGrade || undefined,
        },
      );

      const updated = normalizePosition(res.data);

      setPositions((prev) =>
        prev.map((p) => (p._id === editingPos._id ? updated : p)),
      );
      setEditingPos(null);
      toast.success("Position updated.");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Unable to update position.",
      );
    }
  };

  const handleDeactivatePosition = async (id: string) => {
    try {
      // ✅ send {} body so dto exists in Nest
      await api.patch(`/organization-structure/positions/${id}/deactivate`, {});
      setPositions((prev) =>
        prev.map((p) => (p._id === id ? { ...p, status: "INACTIVE" } : p)),
      );
      toast.success("Position deactivated.");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Unable to deactivate position.",
      );
    } finally {
      setDeactivatePosId(null);
    }
  };

  return (
    <AppShell
      title="Organization structure"
      subtitle="Manage departments and positions."
      allowedRoles={["HR Admin", "System Admin", "HR Manager"]}
    >
      <Card>
        <CardHeader>
          <CardTitle>Organization structure</CardTitle>
          <CardDescription>
            Define departments and positions used across the HR system.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading organization data…
            </p>
          ) : (
            <Tabs defaultValue="tree">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto">
                <TabsTrigger value="tree">
                  <GitBranch className="h-4 w-4 mr-2" />
                  Org Chart
                </TabsTrigger>
                <TabsTrigger value="departments">
                  <Building2 className="h-4 w-4 mr-2" />
                  Departments
                </TabsTrigger>
                <TabsTrigger value="positions">Positions</TabsTrigger>
              </TabsList>

              <TabsContent value="tree" className="pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Organization Hierarchy</CardTitle>
                    <CardDescription>
                      Interactive tree view of your organization structure
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px] pr-4">
                      <OrgTree
                        departments={departments}
                        positions={positions}
                        onDepartmentClick={(dept) => toast.info(`Department: ${dept.name}`)}
                        onPositionClick={(pos) => toast.info(`Position: ${pos.name}`)}
                      />
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="departments" className="pt-4">
                <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Create department</CardTitle>
                      <CardDescription>
                        Add a new department to your organization.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form className="space-y-3" onSubmit={handleCreateDepartment}>
                        <Input
                          placeholder="Name"
                          value={deptForm.name}
                          onChange={(e) =>
                            setDeptForm((prev) => ({ ...prev, name: e.target.value }))
                          }
                          required
                        />
                        <Input
                          placeholder="Code"
                          value={deptForm.code}
                          onChange={(e) =>
                            setDeptForm((prev) => ({ ...prev, code: e.target.value }))
                          }
                          required
                        />
                        <Button type="submit" className="w-full">
                          Create
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  <ScrollArea className="max-h-[520px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {departments.map((dept) => (
                          <TableRow key={dept._id ?? dept.code}>
                            <TableCell>{dept.name || "—"}</TableCell>
                            <TableCell>{dept.code || "—"}</TableCell>
                            <TableCell>
                              {dept.status ? (
                                <Badge variant="secondary" className="uppercase">
                                  {dept.status}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingDept(dept)}
                              >
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                {editingDept && (
                  <div className="mt-6 rounded-lg border bg-muted/30 p-4">
                    <p className="mb-3 text-sm font-medium">Edit department</p>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Input
                        value={editingDept.name ?? ""}
                        onChange={(e) =>
                          setEditingDept((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                        }
                      />
                      <Input
                        value={editingDept.code ?? ""}
                        onChange={(e) =>
                          setEditingDept((prev) => (prev ? { ...prev, code: e.target.value } : prev))
                        }
                      />
                      <div className="col-span-full flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingDept(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveDepartment}>
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="positions" className="pt-4">
                <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Create position</CardTitle>
                      <CardDescription>
                        Assign the position to a department.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form className="space-y-3" onSubmit={handleCreatePosition}>
                        <Input
                          placeholder="Name"
                          value={positionForm.name}
                          onChange={(e) =>
                            setPositionForm((prev) => ({ ...prev, name: e.target.value }))
                          }
                          required
                        />
                        <Input
                          placeholder="Code"
                          value={positionForm.code}
                          onChange={(e) =>
                            setPositionForm((prev) => ({ ...prev, code: e.target.value }))
                          }
                          required
                        />
                        <select
                          value={positionForm.departmentId}
                          onChange={(e) =>
                            setPositionForm((prev) => ({
                              ...prev,
                              departmentId: e.target.value,
                            }))
                          }
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                          required
                        >
                          <option value="">Select department</option>
                          {departments.map((dept) => (
                            <option key={dept._id} value={dept._id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                        <Input
                          placeholder="Pay grade (optional)"
                          value={positionForm.payGrade}
                          onChange={(e) =>
                            setPositionForm((prev) => ({ ...prev, payGrade: e.target.value }))
                          }
                        />
                        <Button type="submit" className="w-full">
                          Create
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  <ScrollArea className="max-h-[520px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Pay grade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {positions.map((pos) => (
                          <TableRow key={pos._id ?? pos.code}>
                            <TableCell>{pos.name || "—"}</TableCell>
                            <TableCell>{pos.code || "—"}</TableCell>
                            <TableCell>
                              {pos.departmentName || departmentMap[pos.departmentId] || "—"}
                            </TableCell>
                            <TableCell>{pos.payGrade || "—"}</TableCell>
                            <TableCell>
                              {pos.status ? (
                                <Badge variant="secondary" className="uppercase">
                                  {pos.status}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setEditingPos({
                                    ...pos,
                                    name: safeStr(pos.name), // controlled
                                    code: safeStr(pos.code),
                                    departmentId: safeStr(pos.departmentId),
                                    payGrade: safeStr(pos.payGrade),
                                  })
                                }
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeactivatePosId(pos._id || "")}
                                disabled={pos.status === "INACTIVE"}
                              >
                                Deactivate
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                {editingPos && (
                  <div className="mt-6 rounded-lg border bg-muted/30 p-4">
                    <p className="mb-3 text-sm font-medium">Edit position</p>
                    <div className="grid gap-3 md:grid-cols-4">
                      <Input
                        value={editingPos.name ?? ""}
                        onChange={(e) =>
                          setEditingPos((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                        }
                      />
                      <Input
                        value={editingPos.code ?? ""}
                        onChange={(e) =>
                          setEditingPos((prev) => (prev ? { ...prev, code: e.target.value } : prev))
                        }
                      />
                      <select
                        value={editingPos.departmentId ?? ""}
                        onChange={(e) =>
                          setEditingPos((prev) =>
                            prev ? { ...prev, departmentId: e.target.value } : prev,
                          )
                        }
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {departments.map((dept) => (
                          <option key={dept._id} value={dept._id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={editingPos.payGrade ?? ""}
                        onChange={(e) =>
                          setEditingPos((prev) =>
                            prev ? { ...prev, payGrade: e.target.value } : prev,
                          )
                        }
                      />
                      <div className="col-span-full flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingPos(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSavePosition}>
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {deactivatePosId && (
                  <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                    <p className="mb-2 font-medium">Deactivate this position?</p>
                    <p className="mb-3 text-xs text-muted-foreground">
                      This will mark the position as inactive but keep its history in the system.
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setDeactivatePosId(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deactivatePosId && handleDeactivatePosition(deactivatePosId)}
                      >
                        Deactivate
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
