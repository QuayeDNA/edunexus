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
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
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

const { GET: listGET, POST } = await import('@/app/api/curricula/route');
const { PATCH, DELETE } = await import('@/app/api/curricula/[id]/route');

describe('GET /api/curricula', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns list of curricula', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.orderBy.mockResolvedValue([{ id: 'cur-1', code: 'SCI', name: 'General Science', subjectCount: 3, schoolId }]);
    const req = new NextRequest('http://localhost/api/curricula');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await listGET(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe('POST /api/curricula', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('creates a curriculum', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValue([]);
    db.returning.mockResolvedValue([{ id: 'cur-1', code: 'SCI', name: 'General Science', schoolId }]);
    const req = new NextRequest('http://localhost/api/curricula', {
      method: 'POST', body: JSON.stringify({ code: 'SCI', name: 'General Science' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
  it('returns 422 for invalid data', async () => {
    const req = new NextRequest('http://localhost/api/curricula', {
      method: 'POST', body: JSON.stringify({ code: '' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});

describe('PATCH /api/curricula/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('updates a curriculum', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValueOnce([{ id: 'cur-1', code: 'SCI', schoolId }]);
    db.returning.mockResolvedValue([{ id: 'cur-1', name: 'Advanced Science' }]);
    const req = new NextRequest('http://localhost/api/curricula/cur-1', {
      method: 'PATCH', body: JSON.stringify({ name: 'Advanced Science' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await PATCH(req, { params: Promise.resolve({ id: 'cur-1' }) });
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe('DELETE /api/curricula/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('deletes a curriculum', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.where.mockImplementationOnce(() => db);
    db.limit.mockResolvedValueOnce([{ id: 'cur-1', schoolId }]);
    db.where.mockImplementationOnce(() => Promise.resolve([{ count: '0' }]));
    db.where.mockImplementationOnce(() => db);
    db.returning.mockResolvedValue([{ id: 'cur-1' }]);
    const req = new NextRequest('http://localhost/api/curricula/cur-1', { method: 'DELETE' });
    req.headers.set('host', 'demo.edunexus.com');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'cur-1' }) });
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
