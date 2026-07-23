import type { UserRole } from "@edunexus/shared";
import type { ReactNode } from "react";

/**
 * Wrap each portal's root layout content in this once. It sets data-role, which
 * globals.css uses to re-point --primary / --ring / --sidebar-primary to that
 * role's accent (Philosophy §4, System §2/§3). Every shadcn/ui primitive nested
 * inside (Button, Sidebar active state, focus rings) re-themes automatically —
 * no component-level changes needed.
 *
 * Usage — drop this around the existing content in each portal layout, e.g.
 * apps/web/app/(school)/teacher/layout.tsx:
 *
 *   return (
 *     <PortalThemeRoot role="teacher">
 *       <TeacherSidebar />
 *       <main>{children}</main>
 *     </PortalThemeRoot>
 *   );
 *
 * Renders a plain div with display:contents so it never affects layout/flow —
 * this is a theming hook, not a structural wrapper.
 */
export function PortalThemeRoot({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  return (
    <div data-role={role} className="contents">
      {children}
    </div>
  );
}
