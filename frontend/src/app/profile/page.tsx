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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { EmployeeProfile } from "@/types/employee";

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-base font-semibold">
                  {initials.toUpperCase()}
                </AvatarFallback>
              </Avatar>
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
                <Button variant="default" onClick={() => router.push("/profile/requests")}>
                  Request Profile Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
