import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { students, enrollments, classes } from "@edunexus/database";
import { eq, and, count, sql } from "drizzle-orm";
import { requireRole } from "@/lib/api/require-role";
import { apiSuccess, apiError } from "@/lib/api/response";
import { resolveTenant } from "@/lib/tenant/resolve";

export async function GET(request: NextRequest) {
  const { error: authError } = await requireRole("admin", "super_admin");
  if (authError) return authError;

  const host = request.headers.get("host") ?? "";
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, "Tenant not resolved");

  const [totalResult] = await db
    .select({ count: count() })
    .from(students)
    .where(eq(students.schoolId, schoolId));
  const total = Number(totalResult.count);

  const [activeResult] = await db
    .select({ count: count() })
    .from(students)
    .where(and(eq(students.schoolId, schoolId), eq(students.status, "active")));
  const activeCount = Number(activeResult.count);

  const byStatus = await db
    .select({ status: students.status, count: count() })
    .from(students)
    .where(eq(students.schoolId, schoolId))
    .groupBy(students.status)
    .orderBy(students.status);

  const byClass = await db
    .select({ className: classes.name, count: count() })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(
      and(eq(enrollments.schoolId, schoolId), eq(enrollments.status, "active")),
    )
    .groupBy(classes.name)
    .orderBy(sql`count DESC`)
    .limit(8);

  return apiSuccess({ total, activeCount, byStatus, byClass });
}
