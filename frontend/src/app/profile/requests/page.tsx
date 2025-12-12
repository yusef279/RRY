"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";

type ChangeRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";

type ChangeRequest = {
  _id?: string;
  field?: string;
  currentValue?: string;
  requestedValue?: string;
  reason?: string;
  status?: ChangeRequestStatus;
  createdAt?: string;
};

const FIELDS = [
  { value: "phone", label: "Phone number" },
  { value: "address", label: "Address" },
  { value: "bio", label: "Bio / Notes" },
  // add more if your backend supports them
];

export default function ProfileChangeRequestsPage() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    field: "",
    currentValue: "",
    requestedValue: "",
    reason: "",
  });

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const res = await api.get(
          "/employee-profile/self/change-requests"
        );
        setRequests(res.data || []);
      } catch (error: any) {
        if (error?.response?.status === 404) {
          // No requests yet – that's fine
          setRequests([]);
        } else {
          console.error(error);
          toast.error(
            error?.response?.data?.message || "Failed to load change requests."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.field || !form.requestedValue || !form.reason) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      // Adjust body keys to match your backend DTO if needed
      const res = await api.post("/employee-profile/change-requests", {
        field: form.field,
        currentValue: form.currentValue || undefined,
        requestedValue: form.requestedValue,
        reason: form.reason,
      });

      const created: ChangeRequest = res.data;
      setRequests((prev) => [created, ...prev]);
      setForm({
        field: "",
        currentValue: "",
        requestedValue: "",
        reason: "",
      });
      toast.success("Change request submitted.");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Could not submit change request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  return (
    <AppShell title="Profile change requests">
      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        {/* LEFT: new request form */}
        <Card>
          <CardHeader>
            <CardTitle>Request profile change</CardTitle>
            <CardDescription>
              Submit a request to update your employee profile. HR will review
              and approve or reject your request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>Field to change</Label>
                <Select
                  value={form.field}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, field: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a field" />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELDS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentValue">
                  Current value{" "}
                  <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="currentValue"
                  value={form.currentValue}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      currentValue: e.target.value,
                    }))
                  }
                  placeholder="What is currently saved in the system?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requestedValue">Requested new value</Label>
                <Input
                  id="requestedValue"
                  required
                  value={form.requestedValue}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      requestedValue: e.target.value,
                    }))
                  }
                  placeholder="What should it be changed to?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  required
                  rows={4}
                  value={form.reason}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="Explain why this change is needed."
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* RIGHT: requests list */}
        <Card>
          <CardHeader>
            <CardTitle>My change requests</CardTitle>
            <CardDescription>
              Track the status of your profile change requests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading requests...</p>
            ) : requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You haven’t submitted any change requests yet.
              </p>
            ) : (
              <ScrollArea className="h-[480px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>Requested value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created at</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((req) => (
                      <TableRow key={req._id}>
                        <TableCell className="font-medium">
                          {req.field || "-"}
                        </TableCell>
                        <TableCell>{req.requestedValue || "-"}</TableCell>
                        <TableCell>
                          {req.status ? (
                            <Badge
                              variant={
                                req.status === "APPROVED"
                                  ? "default"
                                  : req.status === "REJECTED"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="uppercase"
                            >
                              {req.status}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{formatDateTime(req.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
