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
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  };
  return { db: mockDb };
});

const { GET: listGET, POST: createPOST } = await import('@/app/api/subjects/route');
const { PATCH, DELETE } = await import('@/app/api/subjects/[id]/route');

describe('GET /api/subjects', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns list of subjects', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.orderBy.mockResolvedValue([{ id: 'sub-1', code: 'MATH', name: 'Mathematics', schoolId }]);
    const req = new NextRequest('http://localhost/api/subjects');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await listGET(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe('POST /api/subjects', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('creates a subject', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValue([]);
    db.returning.mockResolvedValue([{ id: 'sub-1', code: 'MATH', name: 'Mathematics', schoolId }]);
    const req = new NextRequest('http://localhost/api/subjects', {
      method: 'POST',
      body: JSON.stringify({ code: 'MATH', name: 'Mathematics' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await createPOST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
  it('returns 422 for invalid data', async () => {
    const req = new NextRequest('http://localhost/api/subjects', {
      method: 'POST', body: JSON.stringify({ code: '' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await createPOST(req);
    expect(res.status).toBe(422);
  });
});

describe('PATCH /api/subjects/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('updates a subject', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValueOnce([{ id: 'sub-1', code: 'MATH', schoolId }]);
    db.returning.mockResolvedValue([{ id: 'sub-1', name: 'Advanced Math' }]);
    const req = new NextRequest('http://localhost/api/subjects/sub-1', {
      method: 'PATCH', body: JSON.stringify({ name: 'Advanced Math' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sub-1' }) });
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe('DELETE /api/subjects/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('deletes a subject', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.where.mockImplementationOnce(() => db);
    db.limit.mockResolvedValueOnce([{ id: 'sub-1', schoolId }]);
    db.where.mockImplementationOnce(() => Promise.resolve([{ count: '0' }]));
    db.where.mockImplementationOnce(() => Promise.resolve([{ count: '0' }]));
    db.returning.mockResolvedValue([{ id: 'sub-1' }]);
    const req = new NextRequest('http://localhost/api/subjects/sub-1', { method: 'DELETE' });
    req.headers.set('host', 'demo.edunexus.com');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'sub-1' }) });
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
