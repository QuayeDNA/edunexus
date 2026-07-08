import { requireRole } from '@/lib/auth/auth.guard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, CalendarCheck, DollarSign } from 'lucide-react';

export default async function ParentDashboard() {
  await requireRole('parent');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Parent Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Track your child&apos;s academic journey
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="rounded-xl bg-brand-50 p-3">
              <Users className="h-6 w-6 text-brand-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-text-secondary">
                Wards
              </CardTitle>
              <p className="text-3xl font-bold text-text-primary">0</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">Registered children</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="rounded-xl bg-accent-50 p-3">
              <CalendarCheck className="h-6 w-6 text-accent-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-text-secondary">
                Attendance
              </CardTitle>
              <p className="text-3xl font-bold text-text-primary">0%</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">This term average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="rounded-xl bg-yellow-50 p-3">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-text-secondary">
                Fees Due
              </CardTitle>
              <p className="text-3xl font-bold text-text-primary">₵0</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">Outstanding balance</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
