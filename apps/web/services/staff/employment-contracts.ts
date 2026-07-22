import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { employmentContracts, staff } from '@edunexus/database';
import { NotFoundError } from '@/lib/api/errors';

interface ServiceContext {
  db: any;
  schoolId: string;
}

export const createContractSchema = z.object({
  type: z.enum(['permanent', 'fixed_term', 'part_time']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  salary: z.string().optional(),
  position: z.string().max(100).optional(),
});

export async function listContracts(ctx: ServiceContext, staffId: string) {
  const [existing] = await ctx.db.select({ id: staff.id }).from(staff)
    .where(and(eq(staff.id, staffId), eq(staff.schoolId, ctx.schoolId)))
    .limit(1);
  if (!existing) throw new NotFoundError('Staff');

  const rows = await ctx.db.select()
    .from(employmentContracts)
    .where(and(eq(employmentContracts.staffId, staffId), eq(employmentContracts.schoolId, ctx.schoolId)))
    .orderBy(desc(employmentContracts.startDate));
  return rows;
}

export async function createContract(ctx: ServiceContext, staffId: string, data: z.infer<typeof createContractSchema>) {
  const [existing] = await ctx.db.select({ id: staff.id }).from(staff)
    .where(and(eq(staff.id, staffId), eq(staff.schoolId, ctx.schoolId)))
    .limit(1);
  if (!existing) throw new NotFoundError('Staff');

  const [created] = await ctx.db.insert(employmentContracts).values({
    schoolId: ctx.schoolId,
    staffId,
    type: data.type,
    startDate: data.startDate,
    endDate: data.endDate ?? null,
    salary: data.salary ?? null,
    position: data.position ?? null,
  }).returning();
  return created;
}
