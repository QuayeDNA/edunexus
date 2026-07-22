import { eq, and } from 'drizzle-orm';
import { staff } from '@edunexus/database';
import { NotFoundError } from '@/lib/api/errors';

interface ServiceContext {
  db: any;
  schoolId: string;
}

export async function validateTeacher(ctx: ServiceContext, teacherId: string | null): Promise<string | null> {
  if (!teacherId) return null;
  const [row] = await ctx.db.select({ id: staff.id }).from(staff)
    .where(and(eq(staff.id, teacherId), eq(staff.schoolId, ctx.schoolId), eq(staff.status, 'active')))
    .limit(1);
  if (!row) return `Teacher ${teacherId} not found or inactive in this school`;
  return teacherId;
}
