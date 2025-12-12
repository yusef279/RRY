"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { api } from "@/lib/api";
import type { AuthPayload } from "@/types/auth";

type ChangeRequest = {
  _id: string;
  requestId: string;
  employeeProfileId: string;

  requestDescription: string;

  reason?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";

  submittedAt?: string;
  processedAt?: string;

  createdAt?: string;
  updatedAt?: string;
};

export default function ProfileRequestsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);

  const [fieldName, setFieldName] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [requestedValue, setRequestedValue] = useState("");
  const [reason, setReason] = useState("");

  /* -----------------------------------------------------
     Parse requestDescription → {fieldName, currentValue, ...}
     ----------------------------------------------------- */
  function parseRequestDescription(text: string) {
    if (!text) return {};

    const lines = text.split("\n").map((l) => l.trim());

    const get = (label: string) =>
      lines.find((line) => line.startsWith(label))?.replace(label, "").trim() || "—";

    return {
      fieldName: get("Field:"),
      currentValue: get("From:"),
      requestedValue: get("To:"),
      reason: get("Reason:"),
    };
  }

  /* -----------------------------------------------------
     Load current user and their change requests
     ----------------------------------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }

    let parsed: AuthPayload | null = null;
    try {
      parsed = JSON.parse(stored);
    } catch {
      router.push("/login");
      return;
    }

    if (!parsed?.employeeId) {
      router.push("/login");
      return;
    }

    setUser(parsed);

    const loadRequests = async () => {
      try {
        const res = await api.get<ChangeRequest[]>(
          `/employee-profile/${parsed!.employeeId}/change-requests`,
        );
        setRequests(res.data || []);
      } catch (error: any) {
        const msg = error?.response?.data?.message;
        if (error?.response?.status === 401) {
          router.push("/login");
          return;
        }
        toast.error(msg || "Failed to load change requests.");
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, [router]);

  /* -----------------------------------------------------
     Submit new change request
     ----------------------------------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.employeeId) {
      toast.error("No employee profile linked to this account.");
      return;
    }

    if (!fieldName || !requestedValue) {
      toast.error("Please choose a field and a requested value.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        requestDescription: `
Field: ${fieldName}
From: ${currentValue || "—"}
To: ${requestedValue}
Reason: ${reason || "—"}
        `,
      };

      const res = await api.post<ChangeRequest>(
        `/employee-profile/${user.employeeId}/change-requests`,
        payload,
      );

      setRequests((prev) => [res.data, ...prev]);

      setFieldName("");
      setCurrentValue("");
      setRequestedValue("");
      setReason("");

      toast.success("Change request submitted.");
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      toast.error(msg || "Could not submit change request.");
    } finally {
      setSubmitting(false);
    }
  };

  /* -----------------------------------------------------
     UI
     ----------------------------------------------------- */
  return (
    <AppShell title="Profile change requests">
      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        
        {/* LEFT: CREATE REQUEST */}
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
                <Label htmlFor="field">Field to change</Label>
                <Input
                  id="field"
                  placeholder="e.g. Personal email, Mobile phone"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current">Current value (optional)</Label>
                <Input
                  id="current"
                  placeholder="What is currently saved in the system?"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requested">Requested new value</Label>
                <Input
                  id="requested"
                  placeholder="What should it be changed to?"
                  value={requestedValue}
                  onChange={(e) => setRequestedValue(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  rows={3}
                  placeholder="Explain why this change is needed."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
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

        {/* RIGHT: LIST REQUESTS */}
        <Card>
          <CardHeader>
            <CardTitle>My change requests</CardTitle>
            <CardDescription>
              Track the status of your submitted profile change requests.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">
                Loading change requests...
              </p>
            ) : requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You haven&apos;t submitted any change requests yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Requested value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {requests.map((req) => {
                    const parsed = parseRequestDescription(req.requestDescription);

                    return (
                      <TableRow key={req._id}>
                        <TableCell>{parsed.fieldName}</TableCell>
                        <TableCell>{parsed.requestedValue}</TableCell>
                        <TableCell>{req.status}</TableCell>
                        <TableCell>
                          {req.submittedAt
                            ? new Date(req.submittedAt).toLocaleDateString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>

              </Table>
            )}
          </CardContent>
        </Card>

      </div>
    </AppShell>
  );
}
