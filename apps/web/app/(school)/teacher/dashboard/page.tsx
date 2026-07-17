import { requireRole } from "@/lib/auth/auth.guard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BookOpen, ClipboardCheck, Users } from "lucide-react";

export default async function TeacherDashboard() {
  await requireRole("teacher");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          Teacher Dashboard
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Your classes and tasks at a glance
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="rounded-xl bg-brand-50 p-3">
              <BookOpen className="h-6 w-6 text-brand-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-text-secondary">
                My Classes Today
              </CardTitle>
              <p className="text-3xl font-bold text-text-primary">0</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="rounded-xl bg-yellow-50 p-3">
              <ClipboardCheck className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-text-secondary">
                Pending Assessments
              </CardTitle>
              <p className="text-3xl font-bold text-text-primary">0</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">Awaiting grading</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="rounded-xl bg-accent-50 p-3">
              <Users className="h-6 w-6 text-accent-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-text-secondary">
                Students
              </CardTitle>
              <p className="text-3xl font-bold text-text-primary">0</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">Across all your classes</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
