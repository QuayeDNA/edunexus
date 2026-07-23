import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { academicYears, terms } from "@edunexus/database";
import { auth } from "@/lib/auth/auth.config";
import { TermRibbon } from "./term-ribbon";

/**
 * Data-fetching wrapper for TermRibbon. Drop this directly into each portal
 * layout (see the updated layout.tsx files) — it reads the school from the
 * session (super_admin has no schoolId and renders nothing, which is correct:
 * the platform console isn't scoped to one school's academic calendar).
 */
export async function CurrentTermRibbon() {
  const session = await auth();
  const schoolId = session?.user?.schoolId;

  if (!schoolId) return null;

  const currentYear = await db.query.academicYears.findFirst({
    where: and(eq(academicYears.schoolId, schoolId), eq(academicYears.isCurrent, true)),
  });

  if (!currentYear) return null;

  const yearTerms = await db.query.terms.findMany({
    where: and(eq(terms.schoolId, schoolId), eq(terms.academicYearId, currentYear.id)),
    orderBy: (t, { asc }) => [asc(t.termNumber)],
  });

  if (yearTerms.length === 0) return null;

  return (
    <TermRibbon
      academicYear={{
        name: currentYear.name,
        startDate: currentYear.startDate,
        endDate: currentYear.endDate,
      }}
      terms={yearTerms.map((t) => ({
        id: t.id,
        name: t.name,
        termNumber: t.termNumber,
        startDate: t.startDate,
        endDate: t.endDate,
        isCurrent: t.isCurrent,
        locked: t.locked,
      }))}
    />
  );
}
