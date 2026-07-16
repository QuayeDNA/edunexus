'use client';

import { Badge } from '@/components/ui/badge';

interface EnrollmentRow {
  id: string; className: string | null; academicYearName: string | null;
  status: string; enrollmentDate: string; endDate: string | null;
}

const statusBadge: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  withdrawn: 'bg-red-100 text-red-800',
  transferred_out: 'bg-orange-100 text-orange-800',
  graduated: 'bg-blue-100 text-blue-800',
};

export function StudentEnrollments({ enrollments }: { enrollments: EnrollmentRow[] }) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Enrollment History
      </h3>
      {enrollments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No enrollment records</p>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Academic Year</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Class</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Period</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map(e => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm">{e.academicYearName ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">{e.className ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge className={statusBadge[e.status] ?? ''}>{e.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(e.enrollmentDate).toLocaleDateString('en-GH', { month: 'short', year: 'numeric' })}
                    {e.endDate ? ` — ${new Date(e.endDate).toLocaleDateString('en-GH', { month: 'short', year: 'numeric' })}` : ' — Present'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
