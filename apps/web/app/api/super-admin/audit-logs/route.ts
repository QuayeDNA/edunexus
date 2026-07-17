import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { auditLogs } from '@edunexus/database';
import { desc, eq, and, gte, lte, count } from 'drizzle-orm';
import { routeHandler } from '@/lib/api/handler';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess } from '@/lib/api/response';

export const GET = routeHandler(async (request: NextRequest) => {
  const { error } = await requireRole('super_admin');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const schoolId = searchParams.get('schoolId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  const conditions = and(
    action ? eq(auditLogs.action, action) : undefined,
    schoolId ? eq(auditLogs.schoolId, schoolId) : undefined,
    dateFrom ? gte(auditLogs.createdAt, new Date(dateFrom)) : undefined,
    dateTo ? lte(auditLogs.createdAt, new Date(dateTo)) : undefined,
  );

  const [total] = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(conditions);

  const logs = await db
    .select()
    .from(auditLogs)
    .where(conditions)
    .orderBy(desc(auditLogs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return apiSuccess(logs, {
    page, pageSize,
    total: Number(total.count),
    totalPages: Math.ceil(Number(total.count) / pageSize),
  });
});
