'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, Users, UserPlus, Activity } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

async function fetchStats() {
  const res = await fetch('/api/super-admin/dashboard/stats');
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export default function SuperAdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-dashboard-stats'],
    queryFn: fetchStats,
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Super Admin Dashboard" description="Platform overview" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Super Admin Dashboard" description="Platform overview" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Schools"
          value={data?.totalSchools ?? 0}
          icon={Building2}
        />
        <StatCard
          title="Active Users"
          value={data?.totalUsers ?? 0}
          icon={Users}
        />
        <StatCard
          title="New Signups (30d)"
          value={data?.newSignupsLast30Days ?? 0}
          icon={UserPlus}
        />
        <StatCard
          title="System Status"
          value={data?.systemStatus ?? 'Unknown'}
          icon={Activity}
        />
      </div>

      {data?.usersByRole && data.usersByRole.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Users by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.usersByRole.map((r: { role: string; count: number }) => (
                <div key={r.role} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{r.role.replace('_', ' ')}</span>
                  <span className="font-medium">{r.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
