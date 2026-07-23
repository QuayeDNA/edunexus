"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Wallet,
  DollarSign,
  MessageSquare,
  FileText,
  Settings,
  LogOut,
  ClipboardList,
  Grid3x3,
} from "lucide-react";
import { APP_NAME } from "@/lib/utils/constants";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/applicants", label: "Applicants", icon: ClipboardList },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/staff", label: "Staff", icon: Briefcase },
  { href: "/admin/classes", label: "Classes", icon: GraduationCap },
  { href: "/admin/academics", label: "Academics", icon: BookOpen },
  { href: "/admin/class-subject-teacher", label: "Subject Assign", icon: Grid3x3 },
  { href: "/admin/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/admin/finance", label: "Finance", icon: Wallet },
  { href: "/admin/payroll", label: "Payroll", icon: DollarSign },
  { href: "/admin/messaging", label: "Messaging", icon: MessageSquare },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    // was: bg-white — now bg-sidebar, so dark mode ("Night Register") works here too
    <aside className="flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-6 py-5">
        {/* was: text-brand-600 (shared across all 5 sidebars) — now the admin
            role's own accent via --sidebar-primary, scoped by [data-role="admin"] */}
        <GraduationCap className="h-6 w-6 text-sidebar-primary" />
        <span className="text-lg font-semibold text-sidebar-foreground">
          {APP_NAME}
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === href ||
                (href !== "/dashboard" && pathname.startsWith(href))
                ? // was: bg-brand-50 text-brand-700
                  "bg-sidebar-primary/10 text-sidebar-primary"
                : // was: text-text-secondary hover:bg-surface-hover hover:text-text-primary
                  "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-sidebar-foreground/50">Theme</span>
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sm text-sidebar-foreground/70"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
