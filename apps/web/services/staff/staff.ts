import { z } from 'zod';
import { eq, and, or, like, sql } from 'drizzle-orm';
import { staff, profiles, employmentContracts } from '@edunexus/database';
import { NotFoundError, ConflictError } from '@/lib/api/errors';

interface ServiceContext {
  db: any;
  schoolId: string;
}

export const createStaffSchema = z.object({
  staffIdNumber: z.string().min(1, 'Staff ID is required').max(50),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  otherNames: z.string().max(100).optional(),
  gender: z.enum(['male', 'female']),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  nationality: z.string().max(100).optional(),
  religion: z.string().max(50).optional(),
  address: z.string().optional(),
  phone: z.string().min(1, 'Phone is required').max(20),
  email: z.string().email().optional().or(z.literal('')),
  role: z.enum(['teacher', 'admin', 'support', 'accountant', 'librarian', 'transport', 'nurse']),
  department: z.string().max(100).optional(),
  employmentStatus: z.enum(['permanent', 'contract', 'probation', 'intern', 'part_time']),
  dateHired: z.string().min(1, 'Date hired is required'),
  qualification: z.string().max(100).optional(),
  ssnitNumber: z.string().max(50).optional(),
  bankName: z.string().max(100).optional(),
  bankAccount: z.string().max(50).optional(),
  emergencyContact: z.string().max(20).optional(),
  emergencyName: z.string().max(100).optional(),
  contractType: z.enum(['permanent', 'fixed_term', 'part_time']),
  contractStartDate: z.string().min(1, 'Contract start date is required'),
  contractEndDate: z.string().optional(),
  contractSalary: z.string().optional(),
  contractPosition: z.string().max(100).optional(),
});

export const updateStaffSchema = z.object({
  staffIdNumber: z.string().min(1).max(50).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  otherNames: z.string().max(100).optional(),
  gender: z.enum(['male', 'female']).optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().max(100).optional(),
  religion: z.string().max(50).optional(),
  address: z.string().optional(),
  phone: z.string().min(1).max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  role: z.enum(['teacher', 'admin', 'support', 'accountant', 'librarian', 'transport', 'nurse']).optional(),
  department: z.string().max(100).optional(),
  employmentStatus: z.enum(['permanent', 'contract', 'probation', 'intern', 'part_time']).optional(),
  dateHired: z.string().optional(),
  qualification: z.string().max(100).optional(),
  ssnitNumber: z.string().max(50).optional(),
  bankName: z.string().max(100).optional(),
  bankAccount: z.string().max(50).optional(),
  emergencyContact: z.string().max(20).optional(),
  emergencyName: z.string().max(100).optional(),
});

export interface StaffFilters {
  search?: string;
  department?: string;
  role?: string;
  status?: string;
}

export async function listStaff(ctx: ServiceContext, filters?: StaffFilters) {
  const conditions: any[] = [eq(staff.schoolId, ctx.schoolId), eq(staff.deletedAt, null)];

  if (filters?.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        like(staff.firstName, term),
        like(staff.lastName, term),
        like(staff.staffIdNumber, term),
      ),
    );
  }
  if (filters?.department) conditions.push(eq(staff.department, filters.department));
  if (filters?.role) conditions.push(eq(staff.role, filters.role));
  if (filters?.status) conditions.push(eq(staff.status, filters.status));

  const rows = await ctx.db.select()
    .from(staff)
    .where(and(...conditions))
    .orderBy(staff.lastName, staff.firstName);
  return rows;
}

export async function getStaff(ctx: ServiceContext, id: string) {
  const [row] = await ctx.db.select()
    .from(staff)
    .where(and(eq(staff.id, id), eq(staff.schoolId, ctx.schoolId), eq(staff.deletedAt, null)))
    .limit(1);
  if (!row) throw new NotFoundError('Staff');
  return row;
}

export async function createStaff(ctx: ServiceContext, data: z.infer<typeof createStaffSchema>) {
  const [existing] = await ctx.db.select({ id: staff.id }).from(staff)
    .where(and(eq(staff.schoolId, ctx.schoolId), eq(staff.staffIdNumber, data.staffIdNumber)))
    .limit(1);
  if (existing) throw new ConflictError('A staff member with this ID already exists');

  return await ctx.db.transaction(async (tx: any) => {
    let profileId: string | null = null;
    if (data.email) {
      const [existingProfile] = await tx.select({ id: profiles.id }).from(profiles)
        .where(and(eq(profiles.schoolId, ctx.schoolId), eq(profiles.email, data.email)))
        .limit(1);
      if (existingProfile) {
        profileId = existingProfile.id;
      } else {
        const [createdProfile] = await tx.insert(profiles).values({
          schoolId: ctx.schoolId,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: data.role,
          isActive: true,
        }).returning({ id: profiles.id });
        profileId = createdProfile.id;
      }
    }

    const [created] = await tx.insert(staff).values({
      schoolId: ctx.schoolId,
      staffIdNumber: data.staffIdNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      otherNames: data.otherNames ?? null,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      nationality: data.nationality ?? null,
      religion: data.religion ?? null,
      address: data.address ?? null,
      phone: data.phone,
      email: data.email ?? null,
      role: data.role,
      department: data.department ?? null,
      employmentStatus: data.employmentStatus,
      dateHired: data.dateHired,
      qualification: data.qualification ?? null,
      ssnitNumber: data.ssnitNumber ?? null,
      bankName: data.bankName ?? null,
      bankAccount: data.bankAccount ?? null,
      emergencyContact: data.emergencyContact ?? null,
      emergencyName: data.emergencyName ?? null,
      profileId,
      status: 'active',
    }).returning();

    await tx.insert(employmentContracts).values({
      schoolId: ctx.schoolId,
      staffId: created.id,
      type: data.contractType,
      startDate: data.contractStartDate,
      endDate: data.contractEndDate ?? null,
      salary: data.contractSalary ?? null,
      position: data.contractPosition ?? null,
    });

    return created;
  });
}

export async function updateStaff(ctx: ServiceContext, id: string, data: z.infer<typeof updateStaffSchema>) {
  const [existing] = await ctx.db.select().from(staff)
    .where(and(eq(staff.id, id), eq(staff.schoolId, ctx.schoolId), eq(staff.deletedAt, null)))
    .limit(1);
  if (!existing) throw new NotFoundError('Staff');
  if (data.staffIdNumber && data.staffIdNumber !== existing.staffIdNumber) {
    const [duplicate] = await ctx.db.select({ id: staff.id }).from(staff)
      .where(and(eq(staff.schoolId, ctx.schoolId), eq(staff.staffIdNumber, data.staffIdNumber)))
      .limit(1);
    if (duplicate) throw new ConflictError('A staff member with this ID already exists');
  }
  const [updated] = await ctx.db.update(staff).set({
    ...(data.staffIdNumber !== undefined && { staffIdNumber: data.staffIdNumber }),
    ...(data.firstName !== undefined && { firstName: data.firstName }),
    ...(data.lastName !== undefined && { lastName: data.lastName }),
    ...(data.otherNames !== undefined && { otherNames: data.otherNames }),
    ...(data.gender !== undefined && { gender: data.gender }),
    ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth }),
    ...(data.nationality !== undefined && { nationality: data.nationality }),
    ...(data.religion !== undefined && { religion: data.religion }),
    ...(data.address !== undefined && { address: data.address }),
    ...(data.phone !== undefined && { phone: data.phone }),
    ...(data.email !== undefined && { email: data.email }),
    ...(data.role !== undefined && { role: data.role }),
    ...(data.department !== undefined && { department: data.department }),
    ...(data.employmentStatus !== undefined && { employmentStatus: data.employmentStatus }),
    ...(data.dateHired !== undefined && { dateHired: data.dateHired }),
    ...(data.qualification !== undefined && { qualification: data.qualification }),
    ...(data.ssnitNumber !== undefined && { ssnitNumber: data.ssnitNumber }),
    ...(data.bankName !== undefined && { bankName: data.bankName }),
    ...(data.bankAccount !== undefined && { bankAccount: data.bankAccount }),
    ...(data.emergencyContact !== undefined && { emergencyContact: data.emergencyContact }),
    ...(data.emergencyName !== undefined && { emergencyName: data.emergencyName }),
    updatedAt: new Date(),
  }).where(and(eq(staff.id, id), eq(staff.schoolId, ctx.schoolId)))
    .returning();
  return updated;
}

export async function deactivateStaff(ctx: ServiceContext, id: string) {
  const [existing] = await ctx.db.select({ id: staff.id, status: staff.status }).from(staff)
    .where(and(eq(staff.id, id), eq(staff.schoolId, ctx.schoolId), eq(staff.deletedAt, null)))
    .limit(1);
  if (!existing) throw new NotFoundError('Staff');
  const [updated] = await ctx.db.update(staff).set({
    status: 'inactive',
    updatedAt: new Date(),
  }).where(and(eq(staff.id, id), eq(staff.schoolId, ctx.schoolId)))
    .returning();
  return updated;
}

export async function reactivateStaff(ctx: ServiceContext, id: string) {
  const [existing] = await ctx.db.select({ id: staff.id, status: staff.status }).from(staff)
    .where(and(eq(staff.id, id), eq(staff.schoolId, ctx.schoolId), eq(staff.deletedAt, null)))
    .limit(1);
  if (!existing) throw new NotFoundError('Staff');
  const [updated] = await ctx.db.update(staff).set({
    status: 'active',
    updatedAt: new Date(),
  }).where(and(eq(staff.id, id), eq(staff.schoolId, ctx.schoolId)))
    .returning();
  return updated;
}
