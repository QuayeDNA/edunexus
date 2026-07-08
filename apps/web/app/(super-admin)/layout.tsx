import { requireRole } from '@/lib/auth/auth.guard';
import { SuperAdminSidebar } from '@/components/layouts/super-admin-sidebar';
import type { ReactNode } from 'react';

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  await requireRole('super_admin');

  return (
    <div className="flex min-h-screen">
      <SuperAdminSidebar />
      <main className="flex-1 overflow-y-auto bg-surface-muted p-8">{children}</main>
    </div>
  );
}
