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

const { PUT } = await import('@/app/api/curricula/[id]/subjects/route');

describe('PUT /api/curricula/[id]/subjects', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('assigns subjects to a curriculum', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit
      .mockResolvedValueOnce([{ id: 'cur-1', code: 'SCI', name: 'Science', schoolId }])
      .mockResolvedValueOnce([{ id: 'cur-1', code: 'SCI', name: 'Science', schoolId }]);
    db.transaction.mockImplementation(async (cb: any) => cb(db));
    db.orderBy.mockResolvedValue([]);
    const req = new NextRequest('http://localhost/api/curricula/cur-1/subjects', {
      method: 'PUT',
      body: JSON.stringify({ subjectIds: ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'] }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await PUT(req, { params: Promise.resolve({ id: 'cur-1' }) });
    const body = await res.json();
    expect(body.success).toBe(true);
  });
  it('returns 422 for empty subjectIds', async () => {
    const req = new NextRequest('http://localhost/api/curricula/cur-1/subjects', {
      method: 'PUT',
      body: JSON.stringify({ subjectIds: [] }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await PUT(req, { params: Promise.resolve({ id: 'cur-1' }) });
    expect(res.status).toBe(422);
  });
});
