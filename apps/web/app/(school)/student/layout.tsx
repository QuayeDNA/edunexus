import { requireRole } from "@/lib/auth/auth.guard";
import { StudentSidebar } from "@/components/layouts/student-sidebar";
import type { ReactNode } from "react";

export default async function StudentLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole("student");

  return (
    <div className="flex min-h-screen">
      <StudentSidebar />
      <main className="flex-1 overflow-y-auto bg-surface-muted p-8">
        {children}
      </main>
    </div>
  );
}
