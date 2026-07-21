import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const schoolId = 'school-1';
const GL_ID = '11111111-1111-1111-1111-111111111111';
const AY_ID = '22222222-2222-2222-2222-222222222222';
const CLASS_ID = '33333333-3333-3333-3333-333333333333';

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

const { GET: listGET, POST: createPOST } = await import('@/app/api/classes/route');
const { GET: detailGET, PATCH, DELETE } = await import('@/app/api/classes/[id]/route');

describe('GET /api/classes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 400 if gradeLevelId missing', async () => {
    const req = new NextRequest('http://localhost/api/classes');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await listGET(req);
    expect(res.status).toBe(400);
  });

  it('returns classes for a valid gradeLevelId', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.orderBy.mockResolvedValue([
      { id: 'c-1', name: 'Class 1A', gradeLevelName: 'Primary 1', schoolId },
    ]);

    const req = new NextRequest(`http://localhost/api/classes?gradeLevelId=${GL_ID}`);
    req.headers.set('host', 'demo.edunexus.com');
    const res = await listGET(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe('POST /api/classes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates a class with valid data', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit
      .mockResolvedValueOnce([{ id: GL_ID }])
      .mockResolvedValueOnce([{ id: AY_ID }])
      .mockResolvedValueOnce([]);
    db.returning.mockResolvedValue([{ id: CLASS_ID, name: 'Class 1A', schoolId }]);

    const req = new NextRequest('http://localhost/api/classes', {
      method: 'POST',
      body: JSON.stringify({ name: 'Class 1A', gradeLevelId: GL_ID, academicYearId: AY_ID }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await createPOST(req);
    const body = await res.json();

    if (!body.success) {
      console.error('Create class failed:', body.error || body.errors);
    }
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });
});

describe('PATCH /api/classes/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates a class', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit
      .mockResolvedValueOnce([{ id: CLASS_ID, name: 'Class 1A', gradeLevelId: GL_ID, schoolId, academicYearId: AY_ID }])
      .mockResolvedValueOnce([{ id: GL_ID }])
      .mockResolvedValueOnce([{ id: AY_ID }])
      .mockResolvedValueOnce([]);
    db.returning.mockResolvedValue([{ id: CLASS_ID, name: 'Updated', schoolId }]);

    const req = new NextRequest(`http://localhost/api/classes/${CLASS_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await PATCH(req, { params: Promise.resolve({ id: CLASS_ID }) });
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Updated');
  });
});

describe('DELETE /api/classes/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('soft deletes a class', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValueOnce([{ id: CLASS_ID, schoolId }]);
    db.returning.mockResolvedValue([{ id: CLASS_ID }]);

    const req = new NextRequest(`http://localhost/api/classes/${CLASS_ID}`, { method: 'DELETE' });
    req.headers.set('host', 'demo.edunexus.com');
    const res = await DELETE(req, { params: Promise.resolve({ id: CLASS_ID }) });
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe(true);
  });
});
