import { requireRole } from "@/lib/auth/auth.guard";
import { StudentSidebar } from "@/components/layouts/student-sidebar";
import { PortalThemeRoot } from "@/components/layouts/portal-theme-root";
import { CurrentTermRibbon } from "@/components/shared/current-term-ribbon";
import type { ReactNode } from "react";

export default async function StudentLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole("student");

  return (
    <PortalThemeRoot role="student">
      <div className="flex min-h-screen">
        <StudentSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <CurrentTermRibbon />
          <main className="flex-1 overflow-y-auto bg-surface-muted p-8">
            {children}
          </main>
        </div>
      </div>
    </PortalThemeRoot>
  );
}
