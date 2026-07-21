import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { classes } from "@edunexus/database";
import { eq, and } from "drizzle-orm";
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

  const { searchParams } = new URL(request.url);
  const gradeLevelId = searchParams.get("gradeLevelId");

  const conditions = [eq(classes.schoolId, schoolId)];
  if (gradeLevelId) conditions.push(eq(classes.gradeLevelId, gradeLevelId));

  const rows = await db
    .select({
      id: classes.id,
      name: classes.name,
      code: classes.code,
      capacity: classes.capacity,
      gradeLevelId: classes.gradeLevelId,
    })
    .from(classes)
    .where(and(...conditions))
    .orderBy(classes.name);

  return apiSuccess(rows);
}
