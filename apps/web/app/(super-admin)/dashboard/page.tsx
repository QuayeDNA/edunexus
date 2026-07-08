import { requireRole } from '@/lib/auth/auth.guard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Building2, Users, Activity } from 'lucide-react';

export default async function SuperAdminDashboard() {
  await requireRole('super_admin');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Super Admin Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Platform-wide overview and management
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="rounded-xl bg-brand-50 p-3">
              <Building2 className="h-6 w-6 text-brand-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-text-secondary">
                Total Schools
              </CardTitle>
              <p className="text-3xl font-bold text-text-primary">0</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">Schools registered on the platform</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="rounded-xl bg-accent-50 p-3">
              <Users className="h-6 w-6 text-accent-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-text-secondary">
                Active Users
              </CardTitle>
              <p className="text-3xl font-bold text-text-primary">0</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">Users across all schools</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="rounded-xl bg-blue-50 p-3">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-text-secondary">
                Status
              </CardTitle>
              <p className="text-3xl font-bold text-text-primary">Healthy</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">All systems operational</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
