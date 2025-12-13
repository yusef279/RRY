"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser, clearAuth, hasPermission } from "@/lib/auth";
import { Permission } from "@/types/permissions";
import type { AuthPayload } from "@/types/auth";

/* ------------------------------------------------------------------ */
type AppShellProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /* kept only for page-level guard – not used for menu any more */
  allowedRoles?: string[];
};

type NavItem = { href: string; label: string };

type NavSection = {
  label: string;
  items: NavItem[];
  /* NEW: fine-grained permissions – no more role strings */
  requiredPermissions?: Permission[];
};

/* ================================================================== */
/*  MENU DEFINITION – single source of truth = permissions            */
/* ================================================================== */
const navSections: NavSection[] = [
  { label: "My profile", items: [{ href: "/profile", label: "Profile overview" }] },

  /* Manager section unlocked by the ability to conduct appraisals */
  {
    label: "Manager",
    items: [{ href: "/manager/team", label: "My team" }],
    requiredPermissions: [Permission.CONDUCT_APPRAISALS],
  },

  /* HR Admin section unlocked by profile-management permission */
  {
    label: "HR Admin",
    items: [
      { href: "/admin/employees", label: "Employees" },
      { href: "/admin/requests", label: "Profile change requests" },
      { href: "/admin/org-structure", label: "Org structure" },
    ],
    requiredPermissions: [Permission.MANAGE_ALL_PROFILES],
  },

  /* Employee self-service – no extra permission needed */
  { label: "Performance", items: [{ href: "/performance", label: "My performance" }] },

  /* Full performance-admin unlocked by the master appraisal permission */
  {
    label: "Performance Admin",
    items: [
      { href: "/performance/templates", label: "Templates" },
      { href: "/performance/cycles", label: "Cycles" },
      { href: "/performance/assign", label: "Assign appraisals" },
      { href: "/performance/disputes", label: "Disputes" },
      { href: "/performance/dashboard", label: "Dashboard" },
    ],
    requiredPermissions: [Permission.MANAGE_APPRAISALS],
  },
];

/* ================================================================== */
/*  COMPONENT                                                         */
/* ================================================================== */
export function AppShell({ title, subtitle, children, allowedRoles }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<AuthPayload | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  /* --------- decide which sections to show --------- */
  const visibleSections = useMemo(() => {
    if (user === null) return navSections; // loading – avoid flash
    return navSections.filter((s) =>
      !s.requiredPermissions ? true : s.requiredPermissions.every((p) => hasPermission(user, p))
    );
  }, [user]);

  /* --------- page-level role guard (unchanged) --------- */
  const hasAnyRole = (required?: string[]): boolean => {
    if (!required || required.length === 0) return true;
    if (!user || !user.role) return false;
    return required.includes(user.role);
  };

  const isAllowed = !allowedRoles?.length || (user && hasAnyRole(allowedRoles));

  useEffect(() => {
    if (allowedRoles?.length && user && !isAllowed) router.replace("/profile");
  }, [allowedRoles, isAllowed, router, user]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const initials = user?.email?.split("@")[0]?.slice(0, 2).toUpperCase() || "ME";

  /* --------- render --------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden border-r bg-white/90 backdrop-blur-lg md:flex md:w-64 md:flex-col">
          <div className="flex h-16 items-center gap-2 px-5">
            <div className="h-8 w-8 rounded-xl bg-slate-900 text-center text-lg font-bold text-slate-50 leading-8">HR</div>
            <div>
              <p className="text-sm font-semibold tracking-tight">HR System</p>
              <p className="text-xs text-slate-500">Employee & Org management</p>
            </div>
          </div>
          <Separator />
          <ScrollArea className="flex-1 px-3 py-4">
            {visibleSections.map((section) => (
              <div key={section.label} className="mb-5">
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{section.label}</p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant={active ? "default" : "ghost"}
                          className={cn("w-full justify-start text-sm", active && "bg-slate-900 text-slate-50 hover:bg-slate-900")}
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
            <Avatar className="h-9 w-9"><AvatarFallback>{initials}</AvatarFallback></Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium leading-none">{user?.email?.split("@")[0] || "Current user"}</p>
              <p className="mt-1 text-xs text-slate-500">{user?.email || "user@example.com"}</p>
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8 text-xs" onClick={handleLogout} title="Log out">⏻</Button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1">
          <header className="flex items-center justify-between border-b bg-white/80 px-4 py-3 backdrop-blur-lg md:px-8">
            <div>
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title ?? "Dashboard"}</h1>
              <p className="text-xs text-slate-500 md:text-sm">{subtitle ?? "HR Management System"}</p>
            </div>
          </header>
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}