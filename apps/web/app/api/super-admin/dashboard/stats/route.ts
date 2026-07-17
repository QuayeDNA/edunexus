import { db } from "@/lib/db";
import {
  schools,
  profiles,
  auditLogs,
  schoolSubscriptions,
  schoolPlans,
} from "@edunexus/database";
import { sql, count, gte, desc, eq } from "drizzle-orm";
import { routeHandler } from "@/lib/api/handler";
import { requireRole } from "@/lib/api/require-role";
import { apiSuccess } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export const GET = routeHandler(async () => {
  const { error } = await requireRole("super_admin");
  if (error) return error;

  const [schoolStats] = await db
    .select({
      total: count(),
      active: sql<number>`count(case when ${schools.isActive} = true then 1 end)`,
    })
    .from(schools);

  const [userStats] = await db.select({ total: count() }).from(profiles);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [newSignups] = await db
    .select({ count: count() })
    .from(profiles)
    .where(gte(profiles.createdAt, thirtyDaysAgo));

  const usersByRole = await db
    .select({
      role: profiles.role,
      count: count(),
    })
    .from(profiles)
    .groupBy(profiles.role);

  const [subscriptionStats] = await db
    .select({ total: count() })
    .from(schoolSubscriptions)
    .where(eq(schoolSubscriptions.status, "active"));

  const [mrrResult] = await db
    .select({
      total: sql<number>`coalesce(sum(${schoolPlans.price}), 0)`,
    })
    .from(schoolSubscriptions)
    .leftJoin(schoolPlans, eq(schoolSubscriptions.planId, schoolPlans.id))
    .where(eq(schoolSubscriptions.status, "active"));

  const recentActivity = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      tableName: auditLogs.tableName,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(10);

  return apiSuccess({
    totalSchools: Number(schoolStats.total),
    activeSchools: Number(schoolStats.active),
    totalUsers: Number(userStats.total),
    newSignupsLast30Days: Number(newSignups.count),
    activeSubscriptions: Number(subscriptionStats.total),
    monthlyRecurringRevenue: Number(mrrResult.total),
    usersByRole,
    recentActivity,
    systemStatus: "healthy",
  });
});
