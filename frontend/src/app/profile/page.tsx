"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { EmployeeProfile } from "@/types/employee";

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    personalEmail: "",
    mobilePhone: "",
    homePhone: "",
    address: {
      streetAddress: "",
      city: "",
      country: "",
    },
    biography: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      const user = getCurrentUser();
      if (!user || !user.employeeId) {
        router.push("/login");
        return;
      }

      try {
        const res = await api.get(`/employee-profile/${user.employeeId}`);
        const data: EmployeeProfile = res.data;
        setProfile(data);

        // Appraisal history (self). Ignore 403.
        setHistoryLoading(true);
        try {
          const histRes = await api.get(
            `/performance/employees/${user.employeeId}/history`,
            { params: { limit: 5 } },
          );
          setHistory(histRes.data || []);
        } catch (err: any) {
          const status = err?.response?.status;
          if (status !== 403) {
            console.warn(
              'Failed to load appraisal history',
              err?.response?.data?.message || err?.message,
            );
          }
          setHistory([]);
        } finally {
          setHistoryLoading(false);
        }
      } catch (error: any) {
        const status = error?.response?.status;
        const msg = error?.response?.data?.message;

        if (status === 401) {
          router.push("/login");
          return;
        }

        if (
          status === 400 &&
          (msg === "Invalid employee profile id" ||
            (Array.isArray(msg) && msg.includes("Invalid employee profile id")))
        ) {
          setProfile(null);
        } else {
          console.error(error);
          toast.error(msg || "Failed to load profile.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const fullName =
    (profile?.firstName || "") + " " + (profile?.lastName || "");

  const initials =
    (profile?.firstName?.[0] || "N") + (profile?.lastName?.[0] || "");

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    "http://localhost:5000";

  const photoSrc = useMemo(() => {
    const url =
      profile?.profilePictureUrl ||
      (profile as any)?.profilePicture ||
      (profile as any)?.profilePictureURL;

    if (!url) return "";
    if (typeof url === "string" && url.startsWith("http")) return url;
    return `${apiBase}${url}`;
  }, [apiBase, profile?.profilePictureUrl, profile]);

  const formattedHireDate = profile?.dateOfHire
    ? new Date(profile.dateOfHire).toLocaleDateString()
    : "Not set";

  // ✅ Department display (backend gives primaryDepartmentId populated with { name })
  const departmentName =
    typeof profile?.primaryDepartmentId === "object"
      ? (profile.primaryDepartmentId as any).name || "Not set"
      : (profile as any)?.department?.name || "Not set";

  // ✅ Position display (backend gives primaryPositionId populated with { title, code })
  const positionName =
    typeof profile?.primaryPositionId === "object"
      ? ((profile.primaryPositionId as any).title ||
        (profile.primaryPositionId as any).code ||
        "Not set")
      : ((profile as any)?.position?.title ||
        (profile as any)?.position?.name ||
        (profile as any)?.position?.code ||
        "Not set");

  const openEdit = () => {
    setEditForm({
      personalEmail: profile?.personalEmail || "",
      mobilePhone: profile?.mobilePhone || "",
      homePhone: profile?.homePhone || "",
      address: {
        streetAddress: profile?.address?.streetAddress || "",
        city: profile?.address?.city || "",
        country: profile?.address?.country || "",
      },
      biography: profile?.biography || "",
    });
    setEditOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!profile?._id) return;
    try {
      // Use employeeId from profile (which is the _id in this context usually, or we use route param)
      // The endpoint is PATCH /employee-profile/:id/self-service
      const res = await api.patch(
        `/employee-profile/${profile._id}/self-service`,
        editForm,
      );
      setProfile(res.data);
      setEditOpen(false);
      toast.success("Profile updated successfully.");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Failed to update profile.",
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?._id) return;

    const formData = new FormData();
    formData.append("profilePicture", file);

    const toastId = toast.loading("Uploading...");

    try {
      const res = await api.post(
        `/employee-profile/${profile._id}/profile-picture`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      setProfile(res.data);
      toast.success("Profile picture updated.", { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to upload profile picture.", { id: toastId });
    }
  };

  return (
    <AppShell title="My profile">
      {loading ? (
        <p className="text-muted-foreground">Loading profile...</p>
      ) : !profile ? (
        <Card>
          <CardHeader>
            <CardTitle>No profile found</CardTitle>
            <CardDescription>
              There is no employee profile associated with your account yet.
              Please contact HR to create one.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={photoSrc} alt="Profile picture" />
                  <AvatarFallback className="text-xl font-semibold">
                    {initials.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm cursor-pointer hover:bg-primary/90 transition-colors">
                  <Upload className="h-4 w-4" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              <div>
                <CardTitle className="text-xl">
                  {fullName.trim() || "Employee"}
                </CardTitle>
                <CardDescription>
                  Employee #{profile.employeeNumber || "Not set"}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Position: </span>
                  {positionName}
                </p>
                <p>
                  <span className="font-medium">Department: </span>
                  {departmentName}
                </p>
                <p>
                  <span className="font-medium">Date of hire: </span>
                  {formattedHireDate}
                </p>
              </div>

              <div className="space-y-1 text-sm">
                <p className="font-medium">Status</p>
                {profile.status ? (
                  <Badge variant="secondary" className="uppercase">
                    {profile.status}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </div>

              <div className="space-y-1 text-sm">
                <p className="font-medium">Work email</p>
                <p className="text-sm text-muted-foreground">
                  {profile.workEmail || "Not set"}
                </p>
              </div>

              {profile.biography && (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Bio</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {profile.biography}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact & personal details</CardTitle>
              <CardDescription>
                Your contact information is managed by HR. To request changes, please
                use the "Change Requests" page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Personal email</Label>
                  <p className="text-sm">{profile.personalEmail || "Not set"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Mobile phone</Label>
                  <p className="text-sm">{profile.mobilePhone || "Not set"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Home phone</Label>
                  <p className="text-sm">{profile.homePhone || "Not set"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Date of Birth</Label>
                  <p className="text-sm">
                    {profile.dateOfBirth
                      ? new Date(profile.dateOfBirth).toLocaleDateString()
                      : "Not set"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">National ID</Label>
                  <p className="text-sm">{profile.nationalId || "Not set"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Marital Status</Label>
                  <p className="text-sm">{profile.maritalStatus || "Not set"}</p>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground">Address</Label>
                <p className="text-sm">
                  {profile.address?.streetAddress && (
                    <>
                      {profile.address.streetAddress}
                      <br />
                    </>
                  )}
                  {profile.address?.city && (
                    <>
                      {profile.address.city}
                      <br />
                    </>
                  )}
                  {profile.address?.country || "Not set"}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={openEdit}>
                  Edit Contact Info
                </Button>
                <Button variant="default" onClick={() => router.push("/profile/requests")}>
                  Request Profile Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your contact information and biography. These changes are applied immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Personal Email</Label>
                <Input
                  value={editForm.personalEmail}
                  onChange={(e) =>
                    setEditForm({ ...editForm, personalEmail: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Mobile Phone</Label>
                <Input
                  value={editForm.mobilePhone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, mobilePhone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Home Phone</Label>
                <Input
                  value={editForm.homePhone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, homePhone: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Street Address"
                  value={editForm.address.streetAddress}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      address: { ...editForm.address, streetAddress: e.target.value },
                    })
                  }
                />
                <Input
                  placeholder="City"
                  value={editForm.address.city}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      address: { ...editForm.address, city: e.target.value },
                    })
                  }
                />
                <Input
                  placeholder="Country"
                  value={editForm.address.country}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      address: { ...editForm.address, country: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Biography</Label>
              <Textarea
                rows={4}
                value={editForm.biography}
                onChange={(e) =>
                  setEditForm({ ...editForm, biography: e.target.value })
                }
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
