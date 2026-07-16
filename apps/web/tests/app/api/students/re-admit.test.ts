import { describe, it, expect, vi, beforeEach } from 'vitest';

const classId = '00000000-0000-0000-0000-000000000001';
const academicYearId = '00000000-0000-0000-0000-000000000002';

const tx = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
  orderBy: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  transaction: vi.fn(),
};
vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/api/require-role', () => ({
  requireRole: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: vi.fn().mockResolvedValue({ schoolId: 'school-1' }),
}));

describe('POST /api/students/[id]/re-admit', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('re-admits a withdrawn student', async () => {
    mockDb.limit
      .mockResolvedValueOnce([{ id: 's1', status: 'withdrawn', firstName: 'John', lastName: 'Doe', schoolId: 'school-1' }])
      .mockResolvedValueOnce([{ id: classId, schoolId: 'school-1' }])
      .mockResolvedValueOnce([{ id: academicYearId, schoolId: 'school-1', isCurrent: true }]);

    tx.returning.mockResolvedValue([{ id: 'e1', status: 'active', classId, academicYearId }]);
    mockDb.transaction.mockImplementation(async (cb: any) => cb(tx));

    const { POST } = await import('@/app/api/students/[id]/re-admit/route');
    const res = await POST(new Request('http://localhost:3000/api/students/s1/re-admit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId, academicYearId }),
    }) as any, { params: Promise.resolve({ id: 's1' }) } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.enrollment.status).toBe('active');
  });

  it('rejects re-admission for active student', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 's1', status: 'active', schoolId: 'school-1' }]);

    const { POST } = await import('@/app/api/students/[id]/re-admit/route');
    const res = await POST(new Request('http://localhost:3000/api/students/s1/re-admit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId, academicYearId }),
    }) as any, { params: Promise.resolve({ id: 's1' }) } as any);

    expect(res.status).toBe(422);
  });
});

describe('GET /api/students/inactive', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns inactive students with enrollment info', async () => {
    mockDb.limit
      .mockResolvedValueOnce([{ id: 's1', firstName: 'John', lastName: 'Doe', studentIdNumber: 'AABS2026001', status: 'withdrawn' }])
      .mockResolvedValueOnce([{ studentId: 's1', endDate: '2026-07-15', status: 'withdrawn', transferReason: 'Family relocation', transferSchoolName: null }]);

    const { GET } = await import('@/app/api/students/inactive/route');
    const res = await GET(new Request('http://localhost:3000/api/students/inactive') as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.students.length).toBeGreaterThan(0);
    expect(body.data.students[0].lastEnrollment).toBeDefined();
  });
});
