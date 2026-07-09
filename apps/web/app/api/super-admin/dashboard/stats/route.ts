import { db } from '@edunexus/database';
import { schools, profiles, auditLogs } from '@edunexus/database/src/schema';
import { sql, count, gte, desc } from 'drizzle-orm';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await requireRole('super_admin');
  if (error) return error;

  const [schoolStats] = await db
    .select({
      total: count(),
      active: sql<number>`count(case when ${schools.isActive} = true then 1 end)`,
    })
    .from(schools);

  const [userStats] = await db
    .select({ total: count() })
    .from(profiles);

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
    usersByRole,
    recentActivity,
    systemStatus: 'healthy',
  });
}
