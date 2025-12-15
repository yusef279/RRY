"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { api } from "@/lib/api";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ChangeRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";

type AdminChangeRequest = {
  _id: string;
  requestId: string;
  employeeProfileId: string;
  employeeName?: string;
  employeeNumber?: string;

  requestDescription: string;
  reason?: string;

  status: ChangeRequestStatus;

  submittedAt?: string;
  processedAt?: string;

  createdAt?: string;
  updatedAt?: string;
};

const STATUS_FILTERS: (ChangeRequestStatus | "ALL")[] = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELED",
];

// Parse the big text field into separate parts
function parseRequestDescription(text: string) {
  if (!text) {
    return {
      fieldName: "—",
      currentValue: "—",
      requestedValue: "—",
      reason: "—",
    };
  }

  const lines = text.split("\n").map((l) => l.trim());
  const get = (label: string) =>
    lines.find((line) => line.startsWith(label))?.replace(label, "").trim() ||
    "—";

  return {
    fieldName: get("Field:"),
    currentValue: get("From:"),
    requestedValue: get("To:"),
    reason: get("Reason:"),
  };
}

export default function AdminChangeRequestsPage() {
  const [requests, setRequests] = useState<AdminChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ChangeRequestStatus | "ALL">(
    "PENDING",
  );
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminChangeRequest | null>(null);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [comment, setComment] = useState("");

  // Load pending requests from backend
  useEffect(() => {
    const loadRequests = async () => {
      try {
        // GET /employee-profile/admin/change-requests/pending
        const res = await api.get<AdminChangeRequest[]>(
          "/employee-profile/admin/change-requests/pending",
        );
        setRequests(res.data || []);
      } catch (error: any) {
        console.error(error);
        toast.error(
          error?.response?.data?.message ||
          "Failed to load profile change requests.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, []);

  const filtered = useMemo(() => {
    return requests.filter((req) => {
      const matchesStatus =
        statusFilter === "ALL" || req.status === statusFilter;

      const parsed = parseRequestDescription(req.requestDescription);

      const text =
        [
          req.requestId,
          req.employeeProfileId,
          req.employeeName,
          req.employeeNumber,
          parsed.fieldName,
          parsed.currentValue,
          parsed.requestedValue,
          parsed.reason,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase() || "";

      const matchesSearch =
        !search || text.includes(search.toLowerCase().trim());

      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, search]);

  const openReview = (req: AdminChangeRequest) => {
    setSelected(req);
    setDecision("APPROVED");
    setComment("");
  };

  const handleReviewSubmit = async () => {
    if (!selected) return;

    try {
      // ✅ backend expects requestId here, not _id
      // PATCH /employee-profile/admin/change-requests/:requestId/review
      await api.patch(
        `/employee-profile/admin/change-requests/${selected.requestId}/review`,
        {
          decision,
          comment: comment || undefined,
        },
      );

      toast.success(
        `Request ${decision === "APPROVED" ? "approved" : "rejected"} successfully.`,
      );

      // Backend returns only pending requests; once processed,
      // we can safely remove it from the local list.
      setRequests((prev) =>
        prev.filter((r) => r.requestId !== selected.requestId),
      );
      setSelected(null);
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Failed to review change request.",
      );
    }
  };

  const statusLabel = (status: ChangeRequestStatus) => {
    switch (status) {
      case "PENDING":
        return "Pending";
      case "APPROVED":
        return "Approved";
      case "REJECTED":
        return "Rejected";
      case "CANCELED":
        return "Canceled";
      default:
        return status;
    }
  };

  return (
    <AppShell
      title="Profile change requests"
      subtitle="Review and approve or reject employees' profile updates."
      allowedRoles={["HR Admin", "System Admin"]}
    >
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Change requests</CardTitle>
            <CardDescription>
              Manage pending and historical profile change requests.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input
              placeholder="Search by field or value"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-72"
            />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as ChangeRequestStatus | "ALL",
                )
              }
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s === "ALL" ? "All statuses" : statusLabel(s as any)}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading change requests…
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No change requests found with the current filters.
            </p>
          ) : (
            <ScrollArea className="max-h-[520px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((req) => {
                    const parsed = parseRequestDescription(
                      req.requestDescription,
                    );

                    return (
                      <TableRow key={req._id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {req.employeeName || "Unknown employee"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              #{req.employeeNumber || req.employeeProfileId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {parsed.fieldName}
                        </TableCell>
                        <TableCell className="max-w-[200px] text-xs text-muted-foreground">
                          {parsed.currentValue}
                        </TableCell>
                        <TableCell className="max-w-[200px] text-xs">
                          {parsed.requestedValue}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              req.status === "PENDING"
                                ? "secondary"
                                : req.status === "APPROVED"
                                  ? "default"
                                  : "outline"
                            }
                            className="uppercase"
                          >
                            {statusLabel(req.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {req.submittedAt
                            ? new Date(req.submittedAt).toLocaleString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {req.status === "PENDING" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReview(req)}
                            >
                              Review
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Already {statusLabel(req.status).toLowerCase()}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        {selected && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review change request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm">
                <p className="font-medium">{selected.employeeName || "Unknown employee"}</p>
                <p className="text-xs text-muted-foreground">
                  #{selected.employeeNumber || selected.employeeProfileId}
                </p>
              </div>

              {(() => {
                const parsed = parseRequestDescription(
                  selected.requestDescription,
                );
                return (
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Field:</span>{" "}
                      <span className="font-mono text-xs">
                        {parsed.fieldName}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium">From:</span>{" "}
                      <span className="text-muted-foreground">
                        {parsed.currentValue}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium">To:</span>{" "}
                      {parsed.requestedValue}
                    </p>
                    <p>
                      <span className="font-medium">Reason:</span>{" "}
                      {parsed.reason}
                    </p>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <p className="text-sm font-medium">Decision</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={decision === "APPROVED" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDecision("APPROVED")}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant={decision === "REJECTED" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDecision("REJECTED")}
                  >
                    Reject
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Comment (optional)</p>
                <Textarea
                  rows={3}
                  placeholder="Internal note or explanation for the employee"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelected(null)}
                type="button"
              >
                Cancel
              </Button>
              <Button onClick={handleReviewSubmit} type="button">
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </AppShell>
  );
}
