import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb: Record<string, ReturnType<typeof vi.fn>> = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

const gradeLevelId = '00000000-0000-0000-0000-000000000001';
const classId = '00000000-0000-0000-0000-000000000002';
const academicYearId = '00000000-0000-0000-0000-000000000003';
const schoolId = '656342ad-5a0f-4b90-8362-666675e91fbe';

function makeApplicant(overrides = {}) {
  return {
    id: 'app-1',
    schoolId,
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '2015-06-01',
    gender: 'male',
    guardianName: 'Jane Doe',
    guardianEmail: 'jane@example.com',
    guardianPhone: '0205516734',
    guardianAddress: '123 Main St',
    guardianOccupation: 'Engineer',
    guardianEmployer: 'Tech Co',
    gradeLevelId,
    targetClassId: null,
    previousSchool: null,
    status: 'under_review',
    adminNotes: null,
    createdAt: new Date('2026-06-01'),
    updatedAt: new Date('2026-06-01'),
    anonymizedAt: null,
    ...overrides,
  };
}

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/api/require-role', () => ({
  requireRole: vi.fn().mockResolvedValue({ error: null, user: { id: 'admin-1', role: 'admin' } }),
}));
vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: vi.fn().mockResolvedValue({ schoolId }),
}));
vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => Buffer.from('00000000000000000000000000000000', 'hex')),
  scryptSync: vi.fn(() => Buffer.from('a'.repeat(64))),
}));

const txReturning = vi.fn();

function setupTransaction() {
  const tx = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: txReturning,
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  mockDb.transaction = vi.fn(async (cb: (tx: any) => Promise<any>) => cb(tx));
}

beforeEach(() => {
  vi.clearAllMocks();
  txReturning.mockReset();
  mockDb.transaction = vi.fn();
});

describe('POST /api/applicants/[id]/accept — full conversion', () => {
  it('converts applicant to student, enrollment, guardian atomically', async () => {
    setupTransaction();

    mockDb.limit.mockResolvedValueOnce([makeApplicant()]);
    mockDb.limit.mockResolvedValueOnce([
      { id: classId, name: 'Class 1A', code: 'P1-A', gradeLevelId, capacity: 40, schoolId },
    ]);
    mockDb.limit.mockResolvedValueOnce([{ count: '0' }]);
    mockDb.limit.mockResolvedValueOnce([{ id: schoolId, code: 'AABS001', name: 'Test School' }]);
    mockDb.limit.mockResolvedValueOnce([{ id: academicYearId, isCurrent: true, schoolId }]);

    txReturning
      .mockResolvedValueOnce([{ id: 'student-1', studentIdNumber: 'AABS20260001', firstName: 'John', lastName: 'Doe' }])
      .mockResolvedValueOnce([{ id: 'enrollment-1', classId, academicYearId }])
      .mockResolvedValueOnce([{ id: 'guardian-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' }])
      .mockResolvedValueOnce([{ id: 'student-profile-1', email: 'aabs20260001@edunexus.com' }])
      .mockResolvedValueOnce([{ id: 'parent-profile-1', email: 'jane@example.com' }])
      .mockResolvedValueOnce([{ id: 'app-1', status: 'accepted', targetClassId: classId }]);

    const { POST } = await import('@/app/api/applicants/[id]/accept/route');
    const res = await POST(
      new Request('http://localhost:3000/api/applicants/app-1/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
        body: JSON.stringify({ targetClassId: classId }),
      }) as any,
      { params: Promise.resolve({ id: 'app-1' }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.data.student.studentIdNumber).toBe('AABS20260001');
    expect(body.data.enrollment).toBeDefined();
    expect(body.data.guardian).toBeDefined();
    expect(body.data.credentials.student.email).toBe('aabs20260001@edunexus.com');
    expect(body.data.credentials.parent.email).toBe('jane@example.com');
    expect(mockDb.transaction).toHaveBeenCalledOnce();
  });

  it('rejects if applicant status is not under_review or waitlisted', async () => {
    mockDb.limit.mockResolvedValueOnce([makeApplicant({ status: 'submitted' })]);

    const { POST } = await import('@/app/api/applicants/[id]/accept/route');
    const res = await POST(
      new Request('http://localhost:3000/api/applicants/app-1/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
        body: JSON.stringify({ targetClassId: classId }),
      }) as any,
      { params: Promise.resolve({ id: 'app-1' }) },
    );

    expect(res.status).toBe(422);
  });

  it('returns 409 if class is at capacity and no override', async () => {
    mockDb.limit.mockResolvedValueOnce([makeApplicant()]);
    mockDb.limit.mockResolvedValueOnce([
      { id: classId, name: 'Class 1A', code: 'P1-A', gradeLevelId, capacity: 40, schoolId },
    ]);
    mockDb.limit.mockResolvedValueOnce([{ count: '40' }]);

    const { POST } = await import('@/app/api/applicants/[id]/accept/route');
    const res = await POST(
      new Request('http://localhost:3000/api/applicants/app-1/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
        body: JSON.stringify({ targetClassId: classId, override: false }),
      }) as any,
      { params: Promise.resolve({ id: 'app-1' }) },
    );

    expect(res.status).toBe(409);
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('allows override when class is at capacity', async () => {
    setupTransaction();

    mockDb.limit.mockResolvedValueOnce([makeApplicant()]);
    mockDb.limit.mockResolvedValueOnce([
      { id: classId, name: 'Class 1A', code: 'P1-A', gradeLevelId, capacity: 40, schoolId },
    ]);
    mockDb.limit.mockResolvedValueOnce([{ count: '40' }]);
    mockDb.limit.mockResolvedValueOnce([{ id: schoolId, code: 'AABS001', name: 'Test School' }]);
    mockDb.limit.mockResolvedValueOnce([{ id: academicYearId, isCurrent: true, schoolId }]);

    txReturning
      .mockResolvedValueOnce([{ id: 'student-1', studentIdNumber: 'AABS20260001', firstName: 'John', lastName: 'Doe' }])
      .mockResolvedValueOnce([{ id: 'enrollment-1', classId, academicYearId }])
      .mockResolvedValueOnce([{ id: 'guardian-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' }])
      .mockResolvedValueOnce([{ id: 'student-profile-1', email: 'aabs20260001@edunexus.com' }])
      .mockResolvedValueOnce([{ id: 'parent-profile-1', email: 'jane@example.com' }])
      .mockResolvedValueOnce([{ id: 'app-1', status: 'accepted', targetClassId: classId }]);

    const { POST } = await import('@/app/api/applicants/[id]/accept/route');
    const res = await POST(
      new Request('http://localhost:3000/api/applicants/app-1/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
        body: JSON.stringify({ targetClassId: classId, override: true }),
      }) as any,
      { params: Promise.resolve({ id: 'app-1' }) },
    );

    expect(res.status).toBe(200);
    expect(mockDb.transaction).toHaveBeenCalled();
  });
});
