import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { applicants } from "@edunexus/database";
import { eq, count } from "drizzle-orm";
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

  const statuses = [
    "submitted",
    "under_review",
    "accepted",
    "rejected",
    "waitlisted",
  ] as const;

  const counts = await db
    .select({
      status: applicants.status,
      count: count(),
    })
    .from(applicants)
    .where(eq(applicants.schoolId, schoolId))
    .groupBy(applicants.status);

  const countMap: Record<string, number> = {};
  for (const row of counts) {
    countMap[row.status] = Number(row.count);
  }

  const result: Record<string, number> = { total: 0 };
  for (const s of statuses) {
    result[s] = countMap[s] ?? 0;
    result.total += result[s];
  }

  return apiSuccess(result);
}
