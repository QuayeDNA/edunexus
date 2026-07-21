import { requireRole } from "@/lib/auth/auth.guard";
import { ParentSidebar } from "@/components/layouts/parent-sidebar";
import type { ReactNode } from "react";

export default async function ParentLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole("parent");

  return (
    <div className="flex min-h-screen">
      <ParentSidebar />
      <main className="flex-1 overflow-y-auto bg-surface-muted p-8">
        {children}
      </main>
    </div>
  );
}
