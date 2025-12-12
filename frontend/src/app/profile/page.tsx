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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type EmployeeProfile = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  employeeNumber?: string;
  status?: string;
  departmentName?: string;
  positionTitle?: string;
  dateOfHire?: string;
  workEmail?: string;
  personalEmail?: string;
  phone?: string;
  address?: string;
  bio?: string;
};

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [edit, setEdit] = useState({
    phone: "",
    address: "",
    bio: "",
  });

    useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("/employee-profile/self");
        const data: EmployeeProfile = res.data;
        setProfile(data);
        setEdit({
          phone: data.phone ?? "",
          address: data.address ?? "",
          bio: data.bio ?? "",
        });
      } catch (error: any) {
        const status = error?.response?.status;
        const msg = error?.response?.data?.message;

        if (status === 401) {
          // Not logged in → go to login
          router.push("/login");
          return;
        }

        // Treat "no profile / invalid id" as empty state instead of error toast
        if (
          status === 404 ||
          (status === 400 &&
            (msg === "Invalid employee profile id" ||
              (Array.isArray(msg) && msg.includes("Invalid employee profile id"))))
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


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?._id) {
      toast.error("No employee profile to update.");
      return;
    }

    setSaving(true);
    try {
      // adjust body if your update DTO is different
      const res = await api.patch("/employee-profile/self", {
        phone: edit.phone,
        address: edit.address,
        bio: edit.bio,
      });

      const updated: EmployeeProfile = res.data;
      setProfile(updated);
      setEdit({
        phone: updated.phone ?? "",
        address: updated.address ?? "",
        bio: updated.bio ?? "",
      });

      toast.success("Profile updated successfully.");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Could not update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const fullName =
    (profile?.firstName || "") + " " + (profile?.lastName || "");

  const initials =
    (profile?.firstName?.[0] || "N") + (profile?.lastName?.[0] || "");

  const formattedHireDate = profile?.dateOfHire
    ? new Date(profile.dateOfHire).toLocaleDateString()
    : "Not set";

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
          {/* LEFT: overview card */}
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
                  {profile.positionTitle || "Not set"}
                </p>
                <p>
                  <span className="font-medium">Department: </span>
                  {profile.departmentName || "Not set"}
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
                  {profile.workEmail || profile.personalEmail || "Not set"}
                </p>
              </div>

              {profile.bio && (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Bio</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {profile.bio}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* RIGHT: editable details */}
          <Card>
            <CardHeader>
              <CardTitle>Contact & personal details</CardTitle>
              <CardDescription>
                View and update your contact information. Changes may require HR
                approval depending on system rules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      value={edit.phone}
                      onChange={(e) =>
                        setEdit((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      placeholder="+20..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={edit.address}
                      onChange={(e) =>
                        setEdit((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      placeholder="City, Street, Building..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio / Notes</Label>
                  <Textarea
                    id="bio"
                    rows={4}
                    value={edit.bio}
                    onChange={(e) =>
                      setEdit((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    placeholder="Add a short summary about yourself, your responsibilities, or anything HR should know."
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
