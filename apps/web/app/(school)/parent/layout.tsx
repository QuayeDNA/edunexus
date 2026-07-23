import { requireRole } from "@/lib/auth/auth.guard";
import { ParentSidebar } from "@/components/layouts/parent-sidebar";
import { PortalThemeRoot } from "@/components/layouts/portal-theme-root";
import { CurrentTermRibbon } from "@/components/shared/current-term-ribbon";
import type { ReactNode } from "react";

export default async function ParentLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole("parent");

  return (
    <PortalThemeRoot role="parent">
      <div className="flex min-h-screen">
        <ParentSidebar />
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
