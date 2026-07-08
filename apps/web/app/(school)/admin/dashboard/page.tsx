import { requireRole } from '@/lib/auth/auth.guard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Briefcase, GraduationCap, CalendarCheck, Plus, Upload, Send } from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboard() {
  await requireRole('admin');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">
          School overview and quick actions
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="rounded-xl bg-brand-50 p-3">
              <Users className="h-6 w-6 text-brand-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-text-secondary">
                Students
              </CardTitle>
              <p className="text-3xl font-bold text-text-primary">0</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">Enrolled students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="rounded-xl bg-accent-50 p-3">
              <Briefcase className="h-6 w-6 text-accent-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-text-secondary">
                Staff
              </CardTitle>
              <p className="text-3xl font-bold text-text-primary">0</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">Active staff members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="rounded-xl bg-blue-50 p-3">
              <GraduationCap className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-text-secondary">
                Classes
              </CardTitle>
              <p className="text-3xl font-bold text-text-primary">0</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">Active classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="rounded-xl bg-yellow-50 p-3">
              <CalendarCheck className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-text-secondary">
                Attendance
              </CardTitle>
              <p className="text-3xl font-bold text-text-primary">0%</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">Today&apos;s average</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/students">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-xl bg-brand-50 p-3">
                  <Plus className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">Add New Student</CardTitle>
                  <CardDescription>Enroll a student</CardDescription>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/staff">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-xl bg-accent-50 p-3">
                  <Upload className="h-5 w-5 text-accent-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">Import Data</CardTitle>
                  <CardDescription>Bulk upload students/staff</CardDescription>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/messaging">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-xl bg-blue-50 p-3">
                  <Send className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">Send Announcement</CardTitle>
                  <CardDescription>Notify parents &amp; staff</CardDescription>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
