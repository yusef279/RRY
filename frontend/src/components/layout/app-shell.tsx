// src/components/layout/app-shell.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser, clearAuth } from "@/lib/auth";
import type { AuthPayload } from "@/types/auth";

type AppShellProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /**
   * If provided, only users whose system roles intersect with this list
   * can access this page. Others are redirected to /profile and see nothing.
   */
  allowedRoles?: string[];
};

type NavItem = {
  href: string;
  label: string;
};

type NavSection = {
  label: string;
  items: NavItem[];
  /**
   * Optional: if set, the section is only shown when user has at least
   * one of these roles.
   */
  requiredRoles?: string[];
};

const navSections: NavSection[] = [
  {
    label: "My profile",
    items: [
      { href: "/profile", label: "Profile overview" },
      { href: "/profile/requests", label: "Change requests" },
    ],
  },
  {
    label: "Manager",
    items: [
      { href: "/manager/team", label: "My team" },
      { href: "/manager/team/org-tree", label: "Org Tree" },
      { href: "/manager/team/structure-requests", label: "Structure Requests" },
    ],
    requiredRoles: ["department head", "HR Manager", "HR Admin", "System Admin"],
  },
  {
    label: "HR Admin",
    items: [
      { href: "/admin/employees", label: "Employees" },
      { href: "/admin/requests", label: "Profile change requests" },
      { href: "/admin/org-structure", label: "Org structure" },
    ],
    requiredRoles: ["HR Admin", "System Admin"],
  },
];

export function AppShell({
  title,
  subtitle,
  children,
  allowedRoles,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<AuthPayload | null>(null);

  // Load current user from localStorage
  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  // Helper: does user have at least one of the given roles?
  const hasAnyRole = (required?: string[]) => {
    if (!required || required.length === 0) return true; // no restriction
    if (!user) return false;

    const normalize = (role?: string) =>
      role ? role.toLowerCase().replace(/[\s_]+/g, '').trim() : '';

    const userRoles = [
      user.role,
      ...(user.roles ?? []),
    ]
      .filter(Boolean)
      .map((r) => normalize(r));

    const userPermissions = (user.permissions ?? []).map((p) =>
      normalize(p),
    );

    const req = required.map((r) => normalize(r));
    const roleMatch = req.some((r) => userRoles.includes(r));
    const permMatch = userPermissions.includes('manageallprofiles');
    return roleMatch || permMatch;
  };

  // Which nav sections should be visible?
  const visibleSections = useMemo(() => {
    // If we don't know user yet, show everything to avoid a weird flash.
    if (user === null) return navSections;
    return navSections.filter((section) => hasAnyRole(section.requiredRoles));
  }, [user]);

  // Page-level permission check
  const isAllowed =
    !allowedRoles ||
    !allowedRoles.length ||
    (user && hasAnyRole(allowedRoles));

  // If we have both: allowedRoles + user, and user is not allowed,
  // redirect them to /profile.
  useEffect(() => {
    if (allowedRoles && allowedRoles.length && user && !isAllowed) {
      router.replace("/profile");
    }
  }, [allowedRoles, isAllowed, router, user]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const initials = useMemo(() => {
    if (!user) return "ME";

    const email = user.email || "";
    // Try to extract name from email if available
    const emailName = email.split("@")[0];

    if (emailName && emailName.length >= 2) {
      return emailName.slice(0, 2).toUpperCase();
    }

    return email[0]?.toUpperCase() ?? "ME";
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden border-r bg-white/90 backdrop-blur-lg md:flex md:w-64 md:flex-col">
          <div className="flex h-16 items-center gap-2 px-5">
            <div className="h-8 w-8 rounded-xl bg-slate-900 text-center text-lg font-bold text-slate-50 leading-8">
              HR
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">HR System</p>
              <p className="text-xs text-slate-500">
                Employee &amp; Org management
              </p>
            </div>
          </div>
          <Separator />
          <ScrollArea className="flex-1 px-3 py-4">
            {visibleSections.map((section) => (
              <div key={section.label} className="mb-5">
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/");
                    return (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant={active ? "default" : "ghost"}
                          className={cn(
                            "w-full justify-start text-sm",
                            active &&
                            "bg-slate-900 text-slate-50 hover:bg-slate-900"
                          )}
                        >
                          {item.label}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </ScrollArea>
          <Separator />
          <div className="flex items-center gap-3 px-4 py-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium leading-none">
                {user?.email?.split("@")[0] || "Current user"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {user?.email || "user@example.com"}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-xs"
              onClick={handleLogout}
              title="Log out"
            >
              ⏻
            </Button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1">
          <header className="flex items-center justify-between border-b bg-white/80 px-4 py-3 backdrop-blur-lg md:px-8">
            <div>
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                {title ?? "Dashboard"}
              </h1>
              <p className="text-xs text-slate-500 md:text-sm">
                {subtitle ?? "HR Management System"}
              </p>
            </div>
          </header>

          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
            {/* While roles are loading, just show content.
                Once roles are known & disallowed, the redirect above will kick in. */}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
