import { requireRole } from '@/lib/auth/auth.guard';
import { TeacherSidebar } from '@/components/layouts/teacher-sidebar';
import type { ReactNode } from 'react';

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  await requireRole('teacher');

  return (
    <div className="flex min-h-screen">
      <TeacherSidebar />
      <main className="flex-1 overflow-y-auto bg-surface-muted p-8">{children}</main>
    </div>
  );
}
