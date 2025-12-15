"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, FileText, Loader2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { api } from "@/lib/api";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type RequestType =
    | "NEW_DEPARTMENT"
    | "UPDATE_DEPARTMENT"
    | "NEW_POSITION"
    | "UPDATE_POSITION"
    | "CLOSE_POSITION";

type RequestStatus =
    | "DRAFT"
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "CANCELED"
    | "IMPLEMENTED";

interface StructureRequest {
    _id: string;
    requestNumber: string;
    requestType: RequestType;
    status: RequestStatus;
    reason?: string;
    submittedAt: string;
    details?: string; // JSON string
}

export default function ManagerStructureRequestsPage() {
    const [requests, setRequests] = useState<StructureRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formType, setFormType] = useState<RequestType>("NEW_POSITION");
    const [formReason, setFormReason] = useState("");
    const [formDetails, setFormDetails] = useState<any>({});

    // Reference Data
    const [departments, setDepartments] = useState<any[]>([]);
    const [positions, setPositions] = useState<any[]>([]);

    useEffect(() => {
        loadData();
        loadReferences();
    }, []);

    const loadData = async () => {
        try {
            const res = await api.get("/organization-structure/change-requests/my");
            setRequests(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load requests.");
        } finally {
            setLoading(false);
        }
    };

    const loadReferences = async () => {
        try {
            const [deptRes, posRes] = await Promise.all([
                api.get("/organization-structure/departments"),
                api.get("/organization-structure/positions"),
            ]);
            setDepartments(deptRes.data || []);
            setPositions(posRes.data || []);
        } catch (error) {
            console.error("Failed to load references", error);
        }
    };

    const handleSubmit = async () => {
        if (!formReason) {
            toast.error("Please provide a reason.");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                requestType: formType,
                reason: formReason,
                details: formDetails,
                // Map target IDs based on type
                targetDepartmentId:
                    formType === "UPDATE_DEPARTMENT" ? formDetails.targetDepartmentId : undefined,
                targetPositionId:
                    ["UPDATE_POSITION", "CLOSE_POSITION"].includes(formType)
                        ? formDetails.targetPositionId
                        : undefined,
            };

            await api.post("/organization-structure/change-requests", payload);
            toast.success("Request submitted successfully.");
            setCreateOpen(false);
            setFormReason("");
            setFormDetails({});
            loadData(); // Reload list
        } catch (error: any) {
            console.error(error);
            toast.error(error?.response?.data?.message || "Failed to submit request.");
        } finally {
            setSubmitting(false);
        }
    };

    const renderFormFields = () => {
        switch (formType) {
            case "NEW_POSITION":
                return (
                    <>
                        <div className="space-y-2">
                            <Label>Position Title</Label>
                            <Input
                                value={formDetails.title || ""}
                                onChange={(e) =>
                                    setFormDetails({ ...formDetails, title: e.target.value })
                                }
                                placeholder="e.g. Senior Developer"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Position Code</Label>
                            <Input
                                value={formDetails.code || ""}
                                onChange={(e) =>
                                    setFormDetails({ ...formDetails, code: e.target.value })
                                }
                                placeholder="e.g. DEV-SR-01"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Select
                                value={formDetails.departmentId}
                                onValueChange={(val) =>
                                    setFormDetails({ ...formDetails, departmentId: val })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map((d) => (
                                        <SelectItem key={d._id} value={d._id}>
                                            {d.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Reports To (Optional)</Label>
                            <Select
                                value={formDetails.reportsToPositionId}
                                onValueChange={(val) =>
                                    setFormDetails({ ...formDetails, reportsToPositionId: val })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Manager Position" />
                                </SelectTrigger>
                                <SelectContent>
                                    {positions.map((p) => (
                                        <SelectItem key={p._id} value={p._id}>
                                            {p.title || p.name || p.code}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                );

            case "UPDATE_POSITION":
            case "CLOSE_POSITION":
                return (
                    <>
                        <div className="space-y-2">
                            <Label>Target Position</Label>
                            <Select
                                value={formDetails.targetPositionId}
                                onValueChange={(val) =>
                                    setFormDetails({ ...formDetails, targetPositionId: val })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Position to Update" />
                                </SelectTrigger>
                                <SelectContent>
                                    {positions.map((p) => (
                                        <SelectItem key={p._id} value={p._id}>
                                            {p.title || p.name || p.code}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {formType === "UPDATE_POSITION" && (
                            <>
                                <div className="space-y-2">
                                    <Label>New Title (Optional)</Label>
                                    <Input
                                        value={formDetails.title || ""}
                                        onChange={(e) =>
                                            setFormDetails({ ...formDetails, title: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>New Reports To (Optional)</Label>
                                    <Select
                                        value={formDetails.reportsToPositionId}
                                        onValueChange={(val) =>
                                            setFormDetails({ ...formDetails, reportsToPositionId: val })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Change Reporting Line" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {positions.map((p) => (
                                                <SelectItem key={p._id} value={p._id}>
                                                    {p.title || p.name || p.code}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}
                    </>
                );

            case "NEW_DEPARTMENT":
                return (
                    <>
                        <div className="space-y-2">
                            <Label>Department Name</Label>
                            <Input
                                value={formDetails.name || ""}
                                onChange={(e) =>
                                    setFormDetails({ ...formDetails, name: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Department Code</Label>
                            <Input
                                value={formDetails.code || ""}
                                onChange={(e) =>
                                    setFormDetails({ ...formDetails, code: e.target.value })
                                }
                            />
                        </div>
                    </>
                );

            case "UPDATE_DEPARTMENT":
                return (
                    <>
                        <div className="space-y-2">
                            <Label>Target Department</Label>
                            <Select
                                value={formDetails.targetDepartmentId}
                                onValueChange={(val) =>
                                    setFormDetails({ ...formDetails, targetDepartmentId: val })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map((d) => (
                                        <SelectItem key={d._id} value={d._id}>
                                            {d.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>New Name</Label>
                            <Input
                                value={formDetails.name || ""}
                                onChange={(e) =>
                                    setFormDetails({ ...formDetails, name: e.target.value })
                                }
                            />
                        </div>
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <AppShell
            title="Structure Change Requests"
            subtitle="Submit requests to update the organization structure."
        >
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>My Requests</CardTitle>
                        <CardDescription>
                            Track the status of your submitted requests.
                        </CardDescription>
                    </div>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Request
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                            <FileText className="mb-2 h-10 w-10 opacity-20" />
                            <p>No requests found.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Request #</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map((req) => (
                                    <TableRow key={req._id}>
                                        <TableCell className="font-medium">
                                            {req.requestNumber}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{req.requestType}</Badge>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                            {req.reason}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    req.status === "APPROVED"
                                                        ? "default" // Using default (primary) for approved
                                                        : req.status === "REJECTED"
                                                            ? "destructive"
                                                            : "secondary"
                                                }
                                            >
                                                {req.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(req.submittedAt).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>New Structure Change Request</DialogTitle>
                        <DialogDescription>
                            Submit a request for HR approval.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Request Type</Label>
                            <Select
                                value={formType}
                                onValueChange={(val) => {
                                    setFormType(val as RequestType);
                                    setFormDetails({}); // Reset details on type change
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NEW_POSITION">New Position</SelectItem>
                                    <SelectItem value="UPDATE_POSITION">Update Position</SelectItem>
                                    <SelectItem value="CLOSE_POSITION">Close Position</SelectItem>
                                    <SelectItem value="NEW_DEPARTMENT">New Department</SelectItem>
                                    <SelectItem value="UPDATE_DEPARTMENT">
                                        Update Department
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {renderFormFields()}

                        <div className="space-y-2">
                            <Label>Reason / Justification</Label>
                            <Textarea
                                placeholder="Why is this change needed?"
                                value={formReason}
                                onChange={(e) => setFormReason(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppShell>
    );
}
