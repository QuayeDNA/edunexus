import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const schoolId = 'school-1';

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => null }) }));
vi.mock('@/lib/auth/auth.config', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'u1', role: 'admin', schoolId, email: 'a@b.com', name: 'A' } }),
}));
vi.mock('@/lib/tenant/resolve', () => ({ resolveTenant: vi.fn().mockResolvedValue({ schoolId }) }));
vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn(),
  };
  return { db: mockDb };
});

const { GET, PUT } = await import('@/app/api/class-subject-teacher/route');

describe('GET /api/class-subject-teacher', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns 400 without gradeLevelId', async () => {
    const req = new NextRequest('http://localhost/api/class-subject-teacher');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
  it('returns 400 without academicYearId', async () => {
    const req = new NextRequest('http://localhost/api/class-subject-teacher?gradeLevelId=gl-1');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
  it('returns matrix data with valid params', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.orderBy.mockResolvedValue([]);
    db.orderBy.mockResolvedValue([]);
    const req = new NextRequest('http://localhost/api/class-subject-teacher?gradeLevelId=gl-1&academicYearId=ay-1');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await GET(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });
});

describe('PUT /api/class-subject-teacher', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns 422 for invalid body', async () => {
    const req = new NextRequest('http://localhost/api/class-subject-teacher', {
      method: 'PUT', body: JSON.stringify({}),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await PUT(req);
    expect(res.status).toBe(422);
  });
  it('saves valid assignments', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValue([{ id: 't-1' }]);
    db.transaction = vi.fn((cb: any) => cb({
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
    }));
    db.where = vi.fn()
      .mockImplementationOnce(() => db)  // validateTeacher: chain
      .mockResolvedValueOnce([])         // detectConflicts: resolve
    const req = new NextRequest('http://localhost/api/class-subject-teacher', {
      method: 'PUT',
      body: JSON.stringify({
        gradeLevelId: 'gl-1',
        academicYearId: 'ay-1',
        assignments: [{ classId: 'c-1', subjectId: 's-1', teacherId: 't-1' }],
      }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await PUT(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.saved).toBe(1);
  });
});
