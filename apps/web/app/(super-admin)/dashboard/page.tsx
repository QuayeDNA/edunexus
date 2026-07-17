"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Building2,
  Users,
  UserPlus,
  CreditCard,
  TrendingUp,
  Activity,
  School,
  ShieldCheck,
  FileText,
  Receipt,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

async function fetchStats() {
  const res = await fetch("/api/super-admin/dashboard/stats");
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

const quickActions = [
  { label: "Schools", href: "/schools", icon: School },
  { label: "Users", href: "/users", icon: Users },
  { label: "Plans", href: "/plans", icon: CreditCard },
  { label: "Subscriptions", href: "/subscriptions", icon: Receipt },
  { label: "Audit Logs", href: "/audit-logs", icon: FileText },
];

function formatGhs(value: number) {
  return `₵${value.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SuperAdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-dashboard-stats"],
    queryFn: fetchStats,
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Super Admin Dashboard"
          description="Platform overview"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Dashboard"
        description="Platform overview"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Schools"
          value={data?.totalSchools ?? 0}
          icon={Building2}
        />
        <StatCard
          title="Active Schools"
          value={data?.activeSchools ?? 0}
          icon={ShieldCheck}
        />
        <StatCard
          title="Total Users"
          value={data?.totalUsers ?? 0}
          icon={Users}
        />
        <StatCard
          title="New Signups (30d)"
          value={data?.newSignupsLast30Days ?? 0}
          icon={UserPlus}
        />
        <StatCard
          title="Active Subscriptions"
          value={data?.activeSubscriptions ?? 0}
          icon={CreditCard}
        />
        <StatCard
          title="Monthly Recurring Revenue"
          value={formatGhs(data?.monthlyRecurringRevenue ?? 0)}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {data?.usersByRole && data.usersByRole.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Users by Role</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.usersByRole.map((r: { role: string; count: number }) => (
                  <div
                    key={r.role}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="capitalize">
                      {r.role.replace("_", " ")}
                    </span>
                    <span className="font-medium">{r.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {data?.recentActivity && data.recentActivity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data.recentActivity.map(
                  (a: {
                    id: string;
                    action: string;
                    tableName: string;
                    createdAt: string;
                  }) => (
                    <li key={a.id} className="flex items-start gap-3 text-sm">
                      <Activity className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{a.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.tableName} ·{" "}
                          {new Date(a.createdAt).toLocaleString("en-GH")}
                        </p>
                      </div>
                    </li>
                  ),
                )}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <action.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{action.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
