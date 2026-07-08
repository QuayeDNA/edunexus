import { requireRole } from '@/lib/auth/auth.guard';
import { AdminSidebar } from '@/components/layouts/admin-sidebar';
import type { ReactNode } from 'react';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole('admin');

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-surface-muted p-8">{children}</main>
    </div>
  );
}
