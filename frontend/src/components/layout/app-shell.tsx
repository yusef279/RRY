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
    items: [{ href: "/manager/team", label: "My team" }],
    requiredRoles: ["department head", "HR Manager", "System Admin"], // tweak if you want
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

  const [userRoles, setUserRoles] = useState<string[] | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Load roles + email + name from localStorage (set in login)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rolesRaw = localStorage.getItem("systemRoles");
      const emailRaw = localStorage.getItem("userEmail");
      const nameRaw = localStorage.getItem("userName");

      if (rolesRaw) {
        const parsed = JSON.parse(rolesRaw);
        if (Array.isArray(parsed)) {
          setUserRoles(parsed.filter((r) => typeof r === "string"));
        } else if (typeof parsed === "string") {
          setUserRoles([parsed]);
        } else {
          setUserRoles(null);
        }
      } else {
        setUserRoles(null);
      }

      setUserEmail(emailRaw || null);
      setUserName(nameRaw || null);
    } catch {
      setUserRoles(null);
      setUserEmail(null);
      setUserName(null);
    }
  }, []);

  // Helper: does user have at least one of the given roles?
  const hasAnyRole = (required?: string[]) => {
    if (!required || required.length === 0) return true; // no restriction
    if (!userRoles || userRoles.length === 0) return false;
    return required.some((r) => userRoles.includes(r));
  };

  // Which nav sections should be visible?
  const visibleSections = useMemo(() => {
    // If we don't know roles yet, show everything to avoid a weird flash.
    if (userRoles === null) return navSections;
    return navSections.filter((section) => hasAnyRole(section.requiredRoles));
  }, [userRoles]);

  // Page-level permission check
  const isAllowed =
    !allowedRoles ||
    !allowedRoles.length ||
    (userRoles && hasAnyRole(allowedRoles));

  // If we have both: allowedRoles + userRoles, and user is not allowed,
  // redirect them to /profile.
  useEffect(() => {
    if (allowedRoles && allowedRoles.length && userRoles && !isAllowed) {
      router.replace("/profile");
    }
  }, [allowedRoles, isAllowed, router, userRoles]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("systemRoles");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");
    }
    router.push("/login");
  };

  const initials = useMemo(() => {
    if (userName) {
      const parts = userName.trim().split(" ");
      if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
      }
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (userEmail) {
      return userEmail[0]?.toUpperCase() ?? "ME";
    }
    return "ME";
  }, [userEmail, userName]);

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
                {userName || "Current user"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {userEmail || "user@example.com"}
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
