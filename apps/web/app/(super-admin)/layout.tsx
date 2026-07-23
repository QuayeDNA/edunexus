import { requireRole } from "@/lib/auth/auth.guard";
import { SuperAdminSidebar } from "@/components/layouts/super-admin-sidebar";
import { PortalThemeRoot } from "@/components/layouts/portal-theme-root";
import type { ReactNode } from "react";

export default async function SuperAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole("super_admin");

  // No CurrentTermRibbon here on purpose — the platform console isn't scoped to
  // one school's academic calendar (super_admin has no schoolId, see auth.guard.ts).
  return (
    <PortalThemeRoot role="super_admin">
      <div className="flex min-h-screen">
        <SuperAdminSidebar />
        <main className="flex-1 overflow-y-auto bg-surface-muted p-8">
          {children}
        </main>
      </div>
    </PortalThemeRoot>
  );
}
