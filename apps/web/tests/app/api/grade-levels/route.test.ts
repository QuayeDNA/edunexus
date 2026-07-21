import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const schoolId = 'school-1';

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => null }) }));
vi.mock('@/lib/auth/auth.config', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'u1', role: 'admin', schoolId, email: 'a@b.com', name: 'A' },
  }),
}));
vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: vi.fn().mockResolvedValue({ schoolId }),
}));
vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnValue([{ id: 'new-id' }]),
  };
  return { db: mockDb };
});

const { GET: listGET, POST: createPOST } = await import('@/app/api/grade-levels/route');
const { GET: detailGET, PATCH, DELETE } = await import('@/app/api/grade-levels/[id]/route');

describe('GET /api/grade-levels', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns list of grade levels', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.orderBy.mockResolvedValue([
      { id: 'gl-1', name: 'Primary 1', classCount: 2, schoolId },
    ]);

    const req = new NextRequest('http://localhost/api/grade-levels');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await listGET(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('POST /api/grade-levels', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates a grade level', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/grade-levels', {
      method: 'POST',
      body: JSON.stringify({ code: 'P1', name: 'Primary 1', level: 5, category: 'primary' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await createPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('returns 400 for invalid data', async () => {
    const req = new NextRequest('http://localhost/api/grade-levels', {
      method: 'POST',
      body: JSON.stringify({ code: '' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await createPOST(req);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/grade-levels/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns a grade level', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValue([{ id: 'gl-1', name: 'Primary 1', classCount: 2, schoolId }]);

    const req = new NextRequest('http://localhost/api/grade-levels/gl-1');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await detailGET(req, { params: Promise.resolve({ id: 'gl-1' }) });
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.id).toBe('gl-1');
  });
});

describe('PATCH /api/grade-levels/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates a grade level', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValueOnce([{ id: 'gl-1', code: 'P1', schoolId }]);
    db.returning.mockResolvedValue([{ id: 'gl-1', name: 'Updated', schoolId }]);

    const req = new NextRequest('http://localhost/api/grade-levels/gl-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await PATCH(req, { params: Promise.resolve({ id: 'gl-1' }) });
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Updated');
  });
});

describe('DELETE /api/grade-levels/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes a grade level', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit
      .mockResolvedValueOnce([{ id: 'gl-1', schoolId }])
      .mockResolvedValueOnce([{ count: '0' }]);
    db.returning.mockResolvedValue([{ id: 'gl-1' }]);

    const req = new NextRequest('http://localhost/api/grade-levels/gl-1', { method: 'DELETE' });
    req.headers.set('host', 'demo.edunexus.com');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'gl-1' }) });
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe(true);
  });
});
