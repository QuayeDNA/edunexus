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
    limit: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    transaction: vi.fn(),
  };
  return { db: mockDb };
});

const { GET } = await import('@/app/api/subject-grade-levels/route');
const { PATCH } = await import('@/app/api/subject-grade-levels/[id]/route');

describe('GET /api/subject-grade-levels', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('lists subjects for a grade level', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.orderBy.mockResolvedValue([{ id: 'sgl-1', subjectId: 'sub-1', code: 'MATH', isCore: true, schoolId }]);
    const req = new NextRequest('http://localhost/api/subject-grade-levels?gradeLevelId=gl-1');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await GET(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
  it('returns 400 if gradeLevelId is missing', async () => {
    const req = new NextRequest('http://localhost/api/subject-grade-levels');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/subject-grade-levels/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('toggles core status', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValue([{ id: 'sgl-1', schoolId, subjectId: 'sub-1', gradeLevelId: 'gl-1', isCore: true }]);
    db.returning.mockResolvedValue([{ id: 'sgl-1', isCore: false }]);
    const req = new NextRequest('http://localhost/api/subject-grade-levels/sgl-1', { method: 'PATCH' });
    req.headers.set('host', 'demo.edunexus.com');
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sgl-1' }) });
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
